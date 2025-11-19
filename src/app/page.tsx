
'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Expand, Star, MessageSquarePlus, Sparkles } from 'lucide-react';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { deployToGithub } from '@/app/actions/deploy';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useUser, useFirebase } from '@/firebase';
import { AuthDialog } from '@/components/app/auth-dialog';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { generateCode } from '@/ai/flows/generate-code-flow';

const initialHtml = `<div id="gameContainer">
    <canvas id="gameCanvas"></canvas>

    <div id="uiLayer">
        <div class="hud" id="hud">
            <div class="score-box">SCORE: <span id="scoreVal">0</span></div>
            <div class="score-box" style="border-color: #ff0055;">HI: <span id="highScoreVal">0</span></div>
        </div>

        <!-- Start Screen -->
        <div id="startScreen" class="screen">
            <h1>Highway<br>Racer</h1>
            <p>Dodge traffic & survive!</p>
            <p>PC: Arrow Keys<br>Mobile: Tap Left/Right</p>
            <button onclick="startGame()">START ENGINE</button>
        </div>

        <!-- Game Over Screen -->
        <div id="gameOverScreen" class="screen hidden">
            <h1 style="color: #ff0055;">CRASHED!</h1>
            <p>Final Score: <span id="finalScore">0</span></p>
            <button onclick="resetGame()">RETRY</button>
        </div>

        <div class="controls-hint" id="mobileHint">Tap Left / Right to Steer</div>
    </div>
</div>`;

const initialCss = `body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #222;
    font-family: 'Orbitron', sans-serif;
    touch-action: none; /* Prevent pull-to-refresh on mobile */
}

#gameContainer {
    position: relative;
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    background: #111;
}

canvas {
    background: #333;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    max-width: 100%;
    height: 100%;
}

/* UI Overlay */
#uiLayer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hud {
    width: 100%;
    max-width: 400px;
    display: flex;
    justify-content: space-between;
    padding: 20px;
    box-sizing: border-box;
    color: #fff;
    text-shadow: 2px 2px 0 #000;
    z-index: 10;
}

.score-box {
    font-size: 24px;
    background: rgba(0, 0, 0, 0.5);
    padding: 5px 15px;
    border-radius: 10px;
    border: 2px solid #00ffcc;
}

/* Screens (Start/Game Over) */
.screen {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    padding: 40px;
    border-radius: 20px;
    border: 3px solid #00ffcc;
    text-align: center;
    color: white;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 280px;
    box-shadow: 0 0 50px rgba(0, 255, 204, 0.3);
}

h1 {
    margin: 0;
    font-size: 32px;
    color: #00ffcc;
    text-transform: uppercase;
    letter-spacing: 2px;
}

p {
    font-size: 14px;
    color: #aaa;
}

button {
    background: #ff0055;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 20px;
    font-family: 'Orbitron', sans-serif;
    cursor: pointer;
    border-radius: 5px;
    transition: transform 0.1s, background 0.2s;
    text-transform: uppercase;
}

button:hover {
    background: #ff2277;
    transform: scale(1.05);
}

button:active {
    transform: scale(0.95);
}

.hidden {
    display: none !important;
}

/* Mobile Controls Hint */
.controls-hint {
    position: absolute;
    bottom: 20px;
    width: 100%;
    text-align: center;
    color: rgba(255,255,255,0.5);
    font-size: 12px;
    pointer-events: none;
}
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
`;

const initialJs = `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameActive = false;
let score = 0;
let highScore = localStorage.getItem('racerHighScore') || 0;
let speed = 5;
let gameLoopId;
let lastTime = 0;
let frameCount = 0;

// Elements
const scoreEl = document.getElementById('scoreVal');
const highScoreEl = document.getElementById('highScoreVal');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const mobileHint = document.getElementById('mobileHint');

// Road Config
const laneCount = 3;
let laneWidth = 100;
let roadX = 0; // Left offset to center road

// Assets
const player = {
    lane: 1, // 0, 1, 2
    y: 0,
    width: 50,
    height: 90,
    color: '#00ffcc',
    speedX: 0,
    x: 0,
    targetX: 0
};

let obstacles = [];
let particles = [];
let roadMarkers = [];

// Initialize Canvas Size
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Calculate road dimensions
    const maxWidth = 450; // Max road width
    const totalRoadWidth = Math.min(canvas.width * 0.95, maxWidth);
    laneWidth = totalRoadWidth / laneCount;
    roadX = (canvas.width - totalRoadWidth) / 2;

    // Set player Y position near bottom
    player.y = canvas.height - 150;
    updatePlayerX(true); // Immediate snap
}
window.addEventListener('resize', resize);
resize();
highScoreEl.innerText = highScore;

// --- INPUT HANDLING ---
let keys = {};

window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
    if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
});

// Mobile Touch
canvas.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    const touchX = e.touches[0].clientX;
    if (touchX < window.innerWidth / 2) moveLeft();
    else moveRight();
    e.preventDefault();
}, {passive: false});

function moveLeft() {
    if (player.lane > 0) {
        player.lane--;
        updatePlayerX();
    }
}

function moveRight() {
    if (player.lane < laneCount - 1) {
        player.lane++;
        updatePlayerX();
    }
}

function updatePlayerX(snap = false) {
    // Calculate center of the target lane
    player.targetX = roadX + (player.lane * laneWidth) + (laneWidth / 2) - (player.width / 2);
    if (snap) player.x = player.targetX;
}

// --- GRAPHICS HELPERS ---

function drawCar(x, y, w, h, color, isPlayer) {
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h - 5, w/2 + 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car Body
    ctx.fillStyle = color;
    // Main chassis
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    
    // Roof / Windshield area
    ctx.fillStyle = isPlayer ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.6)';
    let cabinMargin = 6;
    let cabinY = y + h * 0.25;
    let cabinH = h * 0.45;
    roundRect(ctx, x + cabinMargin, cabinY, w - (cabinMargin*2), cabinH, 5);
    ctx.fill();

    // Lights
    if (isPlayer) {
        // Tail lights (Red)
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(x + 5, y + h - 5, 10, 5);
        ctx.fillRect(x + w - 15, y + h - 5, 10, 5);
        // Headlights (Yellowish) - visually facing up, so technically rear lights are at bottom
    } else {
        // Enemy Headlights (downward facing)
        ctx.fillStyle = '#ffffaa';
        ctx.fillRect(x + 5, y + h - 5, 10, 8);
        ctx.fillRect(x + w - 15, y + h - 5, 10, 8);
    }

    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawRoad() {
    // Grass
    ctx.fillStyle = '#1a1a1a'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road Surface
    ctx.fillStyle = '#333';
    ctx.fillRect(roadX, 0, laneCount * laneWidth, canvas.height);

    // Road Borders
    ctx.fillStyle = '#fff';
    ctx.fillRect(roadX - 10, 0, 10, canvas.height);
    ctx.fillRect(roadX + (laneCount * laneWidth), 0, 10, canvas.height);

    // Lane Markers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    roadMarkers.forEach(m => {
        for (let i = 1; i < laneCount; i++) {
            let lineX = roadX + (i * laneWidth) - 2;
            ctx.fillRect(lineX, m.y, 4, 40);
        }
        m.y += speed;
        if (m.y > canvas.height) m.y = -50;
    });
}

// --- LOGIC ---

function startGame() {
    score = 0;
    speed = 8;
    obstacles = [];
    particles = [];
    roadMarkers = [];
    
    // Init road markers
    for(let i=0; i<10; i++) {
        roadMarkers.push({y: i * 100});
    }

    scoreEl.innerText = '0';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    mobileHint.style.display = 'none';
    
    player.lane = 1;
    updatePlayerX(true);
    
    gameActive = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resetGame() {
    startGame();
}

function spawnObstacle() {
    const lanes = [0, 1, 2];
    // Ensure we don't block all lanes (simple logic: pick 1 or 2 lanes)
    // Chance to spawn 2 cars at once as difficulty increases
    let numCars = Math.random() > 0.7 && score > 500 ? 2 : 1;
    
    for(let i=0; i<numCars; i++) {
        if(lanes.length === 0) break;
        const randIndex = Math.floor(Math.random() * lanes.length);
        const lane = lanes.splice(randIndex, 1)[0];

        // Check vertical distance from last obstacle to prevent overlap
        let tooClose = obstacles.some(o => o.y < -100);
        if (!tooClose) {
            obstacles.push({
                lane: lane,
                x: roadX + (lane * laneWidth) + (laneWidth/2) - 25,
                y: -150 - (Math.random() * 100), // Start above screen
                width: 50,
                height: 90,
                speed: speed * (0.8 + Math.random() * 0.4), // Slight speed variance
                color: getRandomCarColor()
            });
        }
    }
}

function getRandomCarColor() {
    const colors = ['#ff3333', '#3355ff', '#ffff33', '#aa33ff', '#ff8833', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function createExplosion(x, y, color) {
    for(let i=0; i<20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color
        });
    }
}

function updatePhysics() {
    // Smooth player movement
    player.x += (player.targetX - player.x) * 0.2;

    // Spawn obstacles
    // Rate increases with speed
    if (Math.random() < 0.02 + (score * 0.00001)) {
        spawnObstacle();
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += speed * 0.8; // Obstacles move slightly slower than road (relative speed illusion)

        // Collision Detection
        if (rectIntersect(player.x + 5, player.y + 5, player.width - 10, player.height - 10, 
                          obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4)) {
            gameOver(obs);
            return;
        }

        // Remove passed obstacles & Score
        if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
            scoreEl.innerText = score;
            
            // Increase difficulty
            if (score % 100 === 0) {
                speed += 0.5;
            }
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if(p.life <= 0) particles.splice(i, 1);
    }
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

function draw() {
    drawRoad();

    // Obstacles
    obstacles.forEach(obs => {
        drawCar(obs.x, obs.y, obs.width, obs.height, obs.color, false);
    });

    // Player
    drawCar(player.x, player.y, player.width, player.height, player.color, true);

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });
}

function gameLoop(time) {
    if (!gameActive) return;

    updatePhysics();
    draw();

    if (gameActive) {
        requestAnimationFrame(gameLoop);
    }
}

function gameOver(hitCar) {
    gameActive = false;
    
    // Explosion effect
    createExplosion(player.x + player.width/2, player.y + player.height/2, '#ff0055');
    createExplosion(hitCar.x + hitCar.width/2, hitCar.y + hitCar.height/2, '#ffffff');
    
    // Draw one last frame to show explosion
    draw();

    // High Score Logic
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('racerHighScore', highScore);
        highScoreEl.innerText = highScore;
    }

    // Show Game Over UI
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

// Initial Draw for Menu Background
resize();
for(let i=0; i<10; i++) roadMarkers.push({y: i * 100});
draw();
`;

type MobileView = 'editor' | 'preview';

export default function Home() {
  const [htmlCode, setHtmlCode] = useState(initialHtml);
  const [cssCode, setCssCode] = useState(initialCss);
  const [jsCode, setJsCode] = useState(initialJs);

  const [srcDoc, setSrcDoc] = useState('');
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isFullScreenPreviewOpen, setIsFullScreenPreviewOpen] = useState(false);

  const [mobileView, setMobileView] = useState<MobileView>('editor');

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [lastDeployedProject, setLastDeployedProject] = useState('');
  
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);


  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useUser();
  const { firestore } = useFirebase();

  const runCode = () => {
    setSrcDoc(`
      <html>
        <head>
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
          <script>${jsCode}</script>
        </body>
      </html>
    `);
    if (isMobile) {
      setMobileView('preview');
    }
  };

  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const timeoutId = setTimeout(runCode, 250);

    return () => {
        document.head.removeChild(fontLink);
        clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlCode, cssCode, jsCode]); 

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current || isMobile) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 20 && newWidth < 80) {
            setSidebarWidth(newWidth);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, isMobile]);

  const openDeployDialog = () => {
    if (user) {
      setIsDeployDialogOpen(true);
    } else {
      setIsAuthDialogOpen(true);
    }
  };

  useEffect(() => {
    if(user && isAuthDialogOpen) {
      setIsAuthDialogOpen(false);
      setIsDeployDialogOpen(true);
    }
  }, [user, isAuthDialogOpen]);


  const handleDeploy = async () => {
    if (!projectName) {
      toast({
        variant: 'destructive',
        title: 'Project Name Required',
        description: 'Please enter a name for your project.',
      });
      return;
    }

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to deploy a project.',
      });
      openDeployDialog();
      return;
    }

    setIsDeploying(true);
    setIsDeployDialogOpen(false);

    toast({
      title: 'Deploying Project...',
      description: "Your site will be ready in about 45 seconds. If it's not live after a minute, try refreshing the page.",
    });

    const deploymentPromise = deployToGithub({
      html: htmlCode,
      css: cssCode,
      js: jsCode,
      projectName,
      addWatermark,
    });
    
    const timerPromise = new Promise(resolve => setTimeout(resolve, 45000));

    try {
      const [deploymentResult] = await Promise.all([deploymentPromise, timerPromise]);

      if (deploymentResult.success && deploymentResult.url) {
        
        const sitesCollectionRef = collection(firestore, 'sites');
        const newSiteRef = doc(sitesCollectionRef, projectName);

        await setDoc(newSiteRef, {
          userId: user.uid,
          projectName: projectName,
          url: deploymentResult.url,
          deployedAt: new Date(),
        });
        
        setLastDeployedProject(projectName);

        toast({
          title: 'Deployment Successful!',
          description: 'Your link is permanent and free forever.',
          duration: 9000,
          action: (
            <div className="flex items-center gap-2">
              <a href={deploymentResult.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  View Site
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (deploymentResult?.url) {
                    navigator.clipboard.writeText(deploymentResult.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy URL</span>
              </Button>
            </div>
          ),
        });
      } else {
        throw new Error(deploymentResult.error || 'An unknown error occurred during deployment.');
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsDeploying(false);
      setProjectName('');
      setAddWatermark(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating Required',
        description: 'Please select a star rating.',
      });
      return;
    }
    
    if (!user || !firestore) return;

    try {
        const feedbackCollectionRef = collection(firestore, 'feedbacks');
        const newFeedbackRef = doc(feedbackCollectionRef);
        await setDoc(newFeedbackRef, {
            userId: user.uid,
            projectName: lastDeployedProject || 'general',
            rating: feedbackRating,
            comment: feedbackComment,
            submittedAt: new Date(),
        });

        toast({
            title: 'Feedback Submitted!',
            description: 'Thank you for your feedback.',
        });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Feedback Failed',
            description: 'Could not submit your feedback. Please try again.',
        });
    } finally {
        setIsFeedbackDialogOpen(false);
        setFeedbackRating(0);
        setFeedbackComment('');
        setLastDeployedProject('');
    }
  };

  const handleAiButtonClick = () => {
    toast({
        title: 'AI Assistant',
        description: 'Coming soon!',
    });
  };
  
  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <AppHeader
        isDeploying={isDeploying}
        onDeploy={openDeployDialog}
        onRun={runCode}
        mobileView={mobileView}
        onSwitchToCode={() => setMobileView('editor')}
        onFeedbackClick={() => setIsFeedbackDialogOpen(true)}
      />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <main
          ref={containerRef}
          className="flex flex-1 overflow-hidden md:flex-row flex-col"
        >
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              isMobile ? (mobileView === 'editor' ? 'flex' : 'hidden') : 'flex'
            )}
            style={{ width: isMobile ? '100%' : `${sidebarWidth}%` }}
          >
            <CodeEditor
              htmlCode={htmlCode}
              setHtmlCode={setHtmlCode}
              cssCode={cssCode}
              setCssCode={setCssCode}
              jsCode={jsCode}
              setJsCode={setJsCode}
              onOpenAiDialog={handleAiButtonClick}
            />
          </div>

          <div
            onMouseDown={handleMouseDown}
            className="w-2 h-full cursor-col-resize bg-border hover:bg-primary/20 transition-colors hidden md:block"
          />

          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              isMobile ? (mobileView === 'preview' ? 'flex' : 'hidden') : 'flex'
            )}
            style={{ width: isMobile ? '100%' : `${100 - sidebarWidth}%` }}
          >
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
                <div className="flex items-center justify-between pr-2 bg-muted rounded-t-md">
                  <TabsList className="grid w-full grid-cols-1 bg-muted">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullScreenPreviewOpen(true)}>
                    <Expand className="h-4 w-4" />
                    <span className="sr-only">Fullscreen Preview</span>
                  </Button>
                </div>
                <TabsContent value="preview" className="flex-1 overflow-auto bg-white mt-0">
                    <LivePreview srcDoc={srcDoc} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>


      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />

      <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deploy Project</DialogTitle>
            <DialogDescription>
              Your link will be permanent and always free. Deploy your site to the web in one click.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                className="col-span-3"
                placeholder="my-awesome-site"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="watermark" className="text-right">
                Watermark
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="watermark"
                  checked={addWatermark}
                  onCheckedChange={setAddWatermark}
                />
                <Label htmlFor="watermark" className="text-sm font-normal text-muted-foreground">
                  Add "RunAndDeploy" watermark
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleDeploy} disabled={isDeploying || !projectName}>
              {isDeploying ? 'Deploying...' : 'Deploy to Internet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFullScreenPreviewOpen} onOpenChange={setIsFullScreenPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 m-0">
          <DialogHeader className="sr-only">
             <DialogTitle>Full Screen Preview</DialogTitle>
             <DialogDescription>A full screen preview of your code.</DialogDescription>
          </DialogHeader>
          <LivePreview srcDoc={srcDoc} isFullScreen={true} />
        </DialogContent>
      </Dialog>
      
       <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Thank you for using RunAndDeploy! How was your experience?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-8 w-8 cursor-pointer transition-colors',
                    feedbackRating >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  )}
                  onClick={() => setFeedbackRating(star)}
                />
              ))}
            </div>
             <div className="grid w-full gap-1.5">
              <Label htmlFor="feedback-comment">Comments (optional)</Label>
              <Textarea
                id="feedback-comment"
                placeholder="Tell us what you think..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
              Skip
            </Button>
            <Button type="button" onClick={handleFeedbackSubmit}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}

    