// pages/index/index.js
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const BOARD_SIZE = 8;
const ANIMATION_DURATION = 200;
const MATCH_MIN = 3; // 最少需要匹配的数量

Page({

  /**
   * 页面的初始数据
   */
  data: {
    gameStarted: false,
    gameOver: false,
    score: 0,
    lives: 3,
    player: {
      x: 150,
      y: 450,
      width: 40,
      height: 40,
      speed: 5,
      moving: false,
      targetX: 150
    },
    bullets: [],
    bees: [],
    canvasWidth: 300,
    canvasHeight: 500
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    wx.getSystemInfo({
      success: (res) => {
        const canvasWidth = res.windowWidth;
        const canvasHeight = res.windowHeight;
        const playerX = canvasWidth / 2;
        const playerY = canvasHeight - 80;

        this.setData({
          canvasWidth,
          canvasHeight,
          player: {
            ...this.data.player,
            x: playerX,
            y: playerY,
            targetX: playerX
          }
        });

        this.initCanvas();
      }
    });
  },

  initCanvas: function() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          canvas.width = this.data.canvasWidth;
          canvas.height = this.data.canvasHeight;
          
          this.canvas = canvas;
          this.ctx = ctx;
          
          this.drawBackground();
          this.startAnimationFrame();
        }
      });
  },

  startAnimationFrame: function() {
    const animate = () => {
      if (this.data.gameStarted && !this.data.gameOver) {
        this.updateGame();
      }
      this.drawGame();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  },

  drawBackground: function() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('点击开始游戏', this.data.canvasWidth / 2, this.data.canvasHeight / 2);
  },

  startGame: function() {
    if (!this.ctx) {
      this.initCanvas();
      return;
    }

    this.setData({
      gameStarted: true,
      gameOver: false,
      score: 0,
      lives: 3,
      bullets: [],
      bees: []
    });

    this.createBees();
  },

  updateGame: function() {
    this.updatePlayer();
    this.updateBullets();
    this.updateBees();
    this.checkCollisions();
  },

  updatePlayer: function() {
    const player = {...this.data.player};
    const dx = player.targetX - player.x;
    
    // 如果距离目标位置很近，直接设置到目标位置
    if (Math.abs(dx) < player.speed) {
      player.x = player.targetX;
      player.moving = false;
    } else {
      // 否则按速度移动
      player.x += dx > 0 ? player.speed : -player.speed;
      player.moving = true;
    }

    // 确保飞机不会超出屏幕
    player.x = Math.max(player.width / 2, Math.min(this.data.canvasWidth - player.width / 2, player.x));

    this.setData({ player });
  },

  updateBullets: function() {
    let bullets = this.data.bullets.filter(bullet => {
      bullet.y -= 8; // 提高子弹速度
      return bullet.y > 0;
    });
    this.setData({ bullets });
  },

  updateBees: function() {
    if (!this.data.bees.length) return;

    let bees = [...this.data.bees];
    let needsDirectionChange = false;

    bees.forEach(bee => {
      bee.x += bee.direction * bee.speed;
      
      if (bee.x <= 0 || bee.x >= this.data.canvasWidth - bee.width) {
        needsDirectionChange = true;
      }
    });

    if (needsDirectionChange) {
      bees.forEach(bee => {
        bee.direction *= -1;
        bee.y += 20;
      });
    }

    this.setData({ bees });
  },

  drawGame: function() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 清空画布
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);

    // 绘制玩家飞机
    this.drawPlayer(ctx);

    // 绘制子弹
    ctx.fillStyle = '#FF0000';
    this.data.bullets.forEach(bullet => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制蜜蜂
    ctx.fillStyle = '#FFFF00';
    this.data.bees.forEach(bee => {
      ctx.fillRect(bee.x, bee.y, bee.width, bee.height);
    });

    // 绘制分数和生命值
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${this.data.score}`, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`生命: ${this.data.lives}`, this.data.canvasWidth - 10, 30);
  },

  drawPlayer: function(ctx) {
    const player = this.data.player;
    
    // 绘制飞机主体
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height/2);
    ctx.lineTo(player.x - player.width/2, player.y + player.height/2);
    ctx.lineTo(player.x + player.width/2, player.y + player.height/2);
    ctx.closePath();
    ctx.fill();

    // 如果飞机在移动，添加推进器动画
    if (player.moving) {
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.moveTo(player.x - 10, player.y + player.height/2);
      ctx.lineTo(player.x, player.y + player.height/2 + 15);
      ctx.lineTo(player.x + 10, player.y + player.height/2);
      ctx.closePath();
      ctx.fill();
    }
  },

  onTouchMove: function(e) {
    if (!this.data.gameStarted || this.data.gameOver) return;

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    
    this.setData({
      'player.targetX': x
    });
  },

  onTouchStart: function(e) {
    if (!this.data.gameStarted) {
      this.startGame();
      return;
    }

    if (this.data.gameOver) return;

    // 发射子弹
    const bullets = [...this.data.bullets];
    bullets.push({
      x: this.data.player.x,
      y: this.data.player.y - this.data.player.height/2
    });
    this.setData({ bullets });
  },

  checkCollisions: function() {
    const bullets = [...this.data.bullets];
    const bees = [...this.data.bees];
    let score = this.data.score;

    // 检查子弹和蜜蜂的碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
      for (let j = bees.length - 1; j >= 0; j--) {
        if (this.checkCollision(bullets[i], bees[j])) {
          bullets.splice(i, 1);
          bees.splice(j, 1);
          score += 100;
          break;
        }
      }
    }

    // 检查蜜蜂是否到达底部
    bees.forEach(bee => {
      if (bee.y + bee.height >= this.data.player.y - this.data.player.height/2) {
        this.gameOver();
      }
    });

    this.setData({ bullets, bees, score });

    // 如果所有蜜蜂都被消灭，创建新的一波
    if (bees.length === 0) {
      this.createBees();
    }
  },

  checkCollision: function(bullet, bee) {
    if (!bullet || !bee) return false;
    
    return bullet.x >= bee.x &&
           bullet.x <= bee.x + bee.width &&
           bullet.y >= bee.y &&
           bullet.y <= bee.y + bee.height;
  },

  createBees: function() {
    const bees = [];
    const rows = 3;
    const cols = 6;
    const beeWidth = 30;
    const beeHeight = 30;
    const spacing = 20;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        bees.push({
          x: j * (beeWidth + spacing) + spacing,
          y: i * (beeHeight + spacing) + spacing,
          width: beeWidth,
          height: beeHeight,
          direction: 1,
          speed: 2
        });
      }
    }

    this.setData({ bees });
  },

  gameOver: function() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.setData({ gameOver: true });

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.data.canvasWidth / 2, this.data.canvasHeight / 2 - 40);
    ctx.fillText(`最终得分: ${this.data.score}`, this.data.canvasWidth / 2, this.data.canvasHeight / 2);
  },

  restartGame: function() {
    this.startGame();
  },

  onUnload: function() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
});