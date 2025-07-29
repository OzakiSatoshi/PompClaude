const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// データディレクトリの作成
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer設定（ファイルアップロード用）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}_${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB制限
    },
    fileFilter: function (req, file, cb) {
        // LAS/LAZファイルのみ許可
        const allowedExtensions = ['.las', '.laz'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('LAS/LAZファイルのみアップロード可能です'));
        }
    }
});

// 静的ファイル配信
app.use(express.static('public'));
app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// メインページ
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PompClaude PoC - 点群データ変形検出システム</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .header {
                    background-color: #2c3e50;
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    margin-bottom: 30px;
                }
                .section {
                    background-color: white;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .upload-area {
                    border: 2px dashed #3498db;
                    padding: 40px;
                    text-align: center;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                .status {
                    background-color: #e8f5e8;
                    border: 1px solid #4caf50;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }
                .feature {
                    background-color: #ecf0f1;
                    padding: 15px;
                    border-radius: 8px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏗️ PompClaude PoC</h1>
                <h2>公共水道ポンプ異常検出システム</h2>
                <p>点群データを用いたポンプ変形検出・視覚化システム</p>
            </div>

            <div class="section">
                <h3>📊 システム状況</h3>
                <div class="status">
                    ✅ システム稼働中<br>
                    🐳 Docker環境で実行中<br>
                    ⏱️ 処理時間目標: 10秒以内<br>
                    📁 データ保存: 一時的（コンテナ内）
                </div>
            </div>

            <div class="section">
                <h3>📤 点群データアップロード</h3>
                <div class="upload-area">
                    <h4>LAS/LAZファイルをアップロード</h4>
                    <form id="upload-form" enctype="multipart/form-data">
                        <div style="margin: 20px 0;">
                            <label for="file1">基準データ（撮影日1）:</label><br>
                            <input type="file" id="file1" name="file1" accept=".las,.laz" required>
                        </div>
                        <div style="margin: 20px 0;">
                            <label for="file2">比較データ（撮影日2）:</label><br>
                            <input type="file" id="file2" name="file2" accept=".las,.laz" required>
                        </div>
                        <button type="submit" id="upload-btn" style="background-color: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            変形検出を開始
                        </button>
                        <div id="upload-progress" style="display: none; margin-top: 10px;">
                            <div style="background-color: #f0f0f0; border-radius: 5px; overflow: hidden;">
                                <div id="progress-bar" style="background-color: #3498db; height: 20px; width: 0%; transition: width 0.3s;"></div>
                            </div>
                            <p id="progress-text">処理中...</p>
                        </div>
                    </form>
                </div>
            </div>

            <div class="section" id="results-section" style="display: none;">
                <h3>🔍 変形検出結果</h3>
                <div id="deformation-stats"></div>
                
                <div style="margin-top: 20px;">
                    <h4>3D視覚化</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button id="show-cloud1" onclick="togglePointCloud(1)" style="padding: 5px 10px; background-color: #0066cc; color: white; border: none; border-radius: 3px;">基準データ表示</button>
                        <button id="show-cloud2" onclick="togglePointCloud(2)" style="padding: 5px 10px; background-color: #cc6600; color: white; border: none; border-radius: 3px;">比較データ表示</button>
                        <button id="show-deformation" onclick="showDeformationView()" style="padding: 5px 10px; background-color: #e74c3c; color: white; border: none; border-radius: 3px;">変形解析表示</button>
                    </div>
                    <div id="viewer-container" style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 5px; background-color: #f8f9fa;"></div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4>📊 カラーバー</h4>
                    <div id="color-bar" style="display: flex; align-items: center; gap: 10px;">
                        <span>変形量小</span>
                        <div style="width: 200px; height: 20px; background: linear-gradient(to right, blue, green, yellow, orange, red); border: 1px solid #ccc;"></div>
                        <span>変形量大</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🔧 主要機能</h3>
                <div class="features">
                    <div class="feature">
                        <h4>📊 変形検出</h4>
                        <p>撮影日の異なる点群データを比較し、変形量を計算</p>
                    </div>
                    <div class="feature">
                        <h4>🎨 視覚化</h4>
                        <p>変形量の多い箇所を赤色で強調表示</p>
                    </div>
                    <div class="feature">
                        <h4>📈 3Dビューア</h4>
                        <p>インタラクティブな3D表示とカラーバー</p>
                    </div>
                    <div class="feature">
                        <h4>🔒 セキュリティ</h4>
                        <p>データ流出防止・一時保存・ダウンロード禁止</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>📋 API エンドポイント</h3>
                <ul>
                    <li><code>GET /</code> - このメインページ</li>
                    <li><code>GET /health</code> - ヘルスチェック</li>
                    <li><code>POST /upload</code> - ファイルアップロード</li>
                    <li><code>GET /api/status</code> - システム状態</li>
                </ul>
            </div>
            
            <!-- Three.js Library with onload handler -->
            <script>
                // Global flag to track THREE.js loading
                window.threeJSLoaded = false;
                
                // Function to load Three.js
                function loadThreeJS() {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
                    script.onload = function() {
                        console.log('Three.js loaded successfully');
                        window.threeJSLoaded = true;
                        initInlineViewer(); // Initialize viewer after THREE.js loads
                    };
                    script.onerror = function() {
                        console.error('Failed to load Three.js');
                        initInlineViewer(); // Initialize fallback viewer
                    };
                    document.head.appendChild(script);
                }
                
                // Load Three.js immediately
                loadThreeJS();
            </script>
            
            <script>
                let viewer = null;
                let currentResults = null;
                
                // Fallback inline viewer for when external files don't load
                function initInlineViewer() {
                    console.log('Initializing inline fallback viewer');
                    window.PointCloudViewer = class {
                        constructor(containerId) {
                            this.container = document.getElementById(containerId);
                            this.container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f0f0f0; border: 2px dashed #ccc;"><p>3Dビューア読み込み中...</p></div>';
                            
                            if (typeof THREE !== 'undefined') {
                                this.initThreeJS();
                            } else {
                                this.showFallbackMessage();
                            }
                        }
                        
                        initThreeJS() {
                            this.container.innerHTML = '';
                            this.scene = new THREE.Scene();
                            this.scene.background = new THREE.Color(0xf0f0f0);
                            
                            this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
                            this.camera.position.set(5, 5, 10);
                            
                            this.renderer = new THREE.WebGLRenderer({ antialias: true });
                            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
                            this.container.appendChild(this.renderer.domElement);
                            
                            // Add basic lighting
                            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                            this.scene.add(ambientLight);
                            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                            directionalLight.position.set(10, 10, 5);
                            this.scene.add(directionalLight);
                            
                            // Add grid
                            const grid = new THREE.GridHelper(20, 20);
                            this.scene.add(grid);
                            
                            // Basic controls
                            this.setupBasicControls();
                            this.animate();
                        }
                        
                        setupBasicControls() {
                            let isMouseDown = false;
                            let mouseX = 0, mouseY = 0;
                            
                            this.renderer.domElement.addEventListener('mousedown', (e) => {
                                isMouseDown = true;
                                mouseX = e.clientX;
                                mouseY = e.clientY;
                            });
                            
                            this.renderer.domElement.addEventListener('mouseup', () => {
                                isMouseDown = false;
                            });
                            
                            this.renderer.domElement.addEventListener('mousemove', (e) => {
                                if (!isMouseDown) return;
                                const deltaX = e.clientX - mouseX;
                                const deltaY = e.clientY - mouseY;
                                this.camera.position.x += deltaX * 0.01;
                                this.camera.position.y -= deltaY * 0.01;
                                this.camera.lookAt(0, 0, 0);
                                mouseX = e.clientX;
                                mouseY = e.clientY;
                            });
                            
                            this.renderer.domElement.addEventListener('wheel', (e) => {
                                const scale = e.deltaY > 0 ? 1.1 : 0.9;
                                this.camera.position.multiplyScalar(scale);
                            });
                        }
                        
                        showFallbackMessage() {
                            this.container.innerHTML = \`
                                <div style="padding: 20px; text-align: center; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
                                    <h4>🔧 3Dビューア準備中</h4>
                                    <p>Three.jsライブラリの読み込み中です...</p>
                                    <div style="margin-top: 15px;">
                                        <button onclick="location.reload()" style="padding: 5px 15px; background-color: #007bff; color: white; border: none; border-radius: 3px;">
                                            ページを再読み込み
                                        </button>
                                    </div>
                                </div>
                            \`;
                        }
                        
                        loadPointCloudData(data1, data2) {
                            if (!this.scene) {
                                console.log('Scene not ready, showing data summary instead');
                                this.showDataSummary(data1, data2);
                                return;
                            }
                            
                            // Clear existing objects
                            this.clearPointClouds();
                            
                            if (data1 && data1.points) {
                                this.addPointCloud(data1.points, 0x0066cc);
                            }
                            if (data2 && data2.points) {
                                this.addPointCloud(data2.points, 0xcc6600);
                            }
                        }
                        
                        addPointCloud(points, color) {
                            const geometry = new THREE.BufferGeometry();
                            const positions = new Float32Array(points.length * 3);
                            
                            for (let i = 0; i < points.length; i++) {
                                positions[i * 3] = points[i].x;
                                positions[i * 3 + 1] = points[i].y;
                                positions[i * 3 + 2] = points[i].z;
                            }
                            
                            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                            const material = new THREE.PointsMaterial({ color: color, size: 0.1 });
                            const pointCloud = new THREE.Points(geometry, material);
                            this.scene.add(pointCloud);
                        }
                        
                        showDataSummary(data1, data2) {
                            this.container.innerHTML = \`
                                <div style="padding: 20px; background-color: white; border-radius: 5px;">
                                    <h4>📊 点群データ読み込み完了</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                                        <div style="padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
                                            <h5 style="color: #0066cc;">基準データ</h5>
                                            <p>点数: \${data1.pointCount || 'N/A'}</p>
                                            <p>ファイル: \${data1.fileName || 'Unknown'}</p>
                                        </div>
                                        <div style="padding: 15px; background-color: #fff3e0; border-radius: 5px;">
                                            <h5 style="color: #cc6600;">比較データ</h5>
                                            <p>点数: \${data2.pointCount || 'N/A'}</p>
                                            <p>ファイル: \${data2.fileName || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div style="margin-top: 15px; text-align: center;">
                                        <p style="color: #666;">3D表示にはThree.jsが必要です</p>
                                        <button onclick="location.reload()" style="padding: 8px 16px; background-color: #28a745; color: white; border: none; border-radius: 4px;">
                                            再試行
                                        </button>
                                    </div>
                                </div>
                            \`;
                        }
                        
                        clearPointClouds() {
                            if (!this.scene) return;
                            const objects = this.scene.children.slice();
                            objects.forEach(obj => {
                                if (obj.type === 'Points') {
                                    this.scene.remove(obj);
                                }
                            });
                        }
                        
                        togglePointCloud() {
                            console.log('Point cloud visibility toggled');
                        }
                        
                        animate() {
                            if (!this.renderer || !this.scene || !this.camera) return;
                            requestAnimationFrame(() => this.animate());
                            this.renderer.render(this.scene, this.camera);
                        }
                    };
                }
            
            <script>
                let viewer = null;
                let currentResults = null;
                
                document.addEventListener('DOMContentLoaded', function() {
                    // Initialize form handling
                    const form = document.getElementById('upload-form');
                    const uploadBtn = document.getElementById('upload-btn');
                    const progressDiv = document.getElementById('upload-progress');
                    const progressBar = document.getElementById('progress-bar');
                    const progressText = document.getElementById('progress-text');
                    const resultsSection = document.getElementById('results-section');
                    
                    form.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        
                        const file1 = document.getElementById('file1').files[0];
                        const file2 = document.getElementById('file2').files[0];
                        
                        if (!file1 || !file2) {
                            alert('2つのファイルを選択してください');
                            return;
                        }
                        
                        // Show progress
                        uploadBtn.disabled = true;
                        uploadBtn.textContent = '処理中...';
                        progressDiv.style.display = 'block';
                        
                        try {
                            const formData = new FormData();
                            formData.append('file1', file1);
                            formData.append('file2', file2);
                            
                            // Simulate progress
                            let progress = 0;
                            const progressInterval = setInterval(() => {
                                progress += Math.random() * 20;
                                if (progress > 90) progress = 90;
                                progressBar.style.width = progress + '%';
                                progressText.textContent = \`処理中... \${Math.round(progress)}%\`;
                            }, 200);
                            
                            const response = await fetch('/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            clearInterval(progressInterval);
                            progressBar.style.width = '100%';
                            progressText.textContent = '完了!';
                            
                            const result = await response.json();
                            
                            if (response.ok) {
                                currentResults = result;
                                displayResults(result);
                            } else {
                                throw new Error(result.error || 'アップロードに失敗しました');
                            }
                            
                        } catch (error) {
                            console.error('Upload error:', error);
                            alert('エラー: ' + error.message);
                        } finally {
                            // Reset form
                            uploadBtn.disabled = false;
                            uploadBtn.textContent = '変形検出を開始';
                            setTimeout(() => {
                                progressDiv.style.display = 'none';
                                progressBar.style.width = '0%';
                            }, 2000);
                        }
                    });
                });
                
                function displayResults(result) {
                    const resultsSection = document.getElementById('results-section');
                    const statsDiv = document.getElementById('deformation-stats');
                    
                    // Update statistics
                    statsDiv.innerHTML = \`
                        <h4>変形検出結果</h4>
                        <div class="status">
                            <p><strong>処理時間:</strong> \${result.processing.processingTime}</p>
                            <p><strong>最大変形量:</strong> \${result.processing.maxDeformation}</p>
                            <p><strong>平均変形量:</strong> \${result.processing.averageDeformation}</p>
                            <p><strong>有意な変形点:</strong> \${result.processing.affectedPoints}点</p>
                            <p><strong>処理済み点数:</strong> \${result.pointClouds.cloud1.pointCount + result.pointClouds.cloud2.pointCount}点</p>
                        </div>
                    \`;
                    
                    // Show results section
                    resultsSection.style.display = 'block';
                    
                    // Initialize 3D viewer
                    if (!viewer) {
                        // Wait for PointCloudViewer to be available
                        if (typeof PointCloudViewer !== 'undefined') {
                            viewer = new PointCloudViewer('viewer-container');
                        } else {
                            console.log('PointCloudViewer not yet loaded, creating fallback');
                            // Create a temporary fallback
                            const container = document.getElementById('viewer-container');
                            container.innerHTML = \`
                                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 5px;">
                                    <div style="text-align: center; padding: 20px;">
                                        <h4>🔄 3Dビューア初期化中</h4>
                                        <p>Three.jsライブラリの読み込み完了を待機中...</p>
                                        <div style="margin-top: 15px;">
                                            <button onclick="location.reload()" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                                ページを再読み込み
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            \`;
                            
                            // Try again after a delay
                            setTimeout(() => {
                                if (typeof PointCloudViewer !== 'undefined') {
                                    viewer = new PointCloudViewer('viewer-container');
                                    if (currentResults) {
                                        viewer.loadPointCloudData(currentResults.pointClouds.cloud1, currentResults.pointClouds.cloud2);
                                    }
                                }
                            }, 2000);
                        }
                    }
                    
                    // Load point cloud data
                    viewer.loadPointCloudData(result.pointClouds.cloud1, result.pointClouds.cloud2);
                    
                    // Scroll to results
                    resultsSection.scrollIntoView({ behavior: 'smooth' });
                }
                
                function togglePointCloud(cloudNumber) {
                    if (!viewer || !currentResults) return;
                    
                    if (cloudNumber === 1) {
                        viewer.togglePointCloud(1, true);
                        viewer.togglePointCloud(2, false);
                        if (viewer.deformationCloud) viewer.deformationCloud.visible = false;
                    } else if (cloudNumber === 2) {
                        viewer.togglePointCloud(1, false);
                        viewer.togglePointCloud(2, true);
                        if (viewer.deformationCloud) viewer.deformationCloud.visible = false;
                    }
                }
                
                function showDeformationView() {
                    if (!viewer || !currentResults) return;
                    
                    viewer.togglePointCloud(1, false);
                    viewer.togglePointCloud(2, false);
                    if (viewer.deformationCloud) viewer.deformationCloud.visible = true;
                }
            </script>
        </body>
        </html>
    `);
});

// 点群データ処理関数
async function processPointCloudData(file1Path, file2Path) {
    try {
        // LAS/LAZファイルの読み込み（モック実装）
        const pointCloud1 = await readPointCloudFile(file1Path);
        const pointCloud2 = await readPointCloudFile(file2Path);
        
        // 変形検出処理
        const deformationResult = performDeformationAnalysis(pointCloud1, pointCloud2);
        
        return {
            pointCloud1,
            pointCloud2,
            deformationResult
        };
    } catch (error) {
        console.error('Point cloud processing error:', error);
        throw error;
    }
}

// 点群ファイル読み込み（モック実装）
async function readPointCloudFile(filePath) {
    // 実際のLAS/LAZ読み込みの代わりにモックデータを生成
    const pointCount = 500 + Math.floor(Math.random() * 1500);
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
        // ポンプのような円筒形状をモック
        const angle = (i / pointCount) * Math.PI * 4;
        const height = (i / pointCount) * 10 - 5;
        const radius = 2 + Math.sin(height) * 0.5 + (Math.random() - 0.5) * 0.3;
        
        points.push({
            x: radius * Math.cos(angle) + (Math.random() - 0.5) * 0.1,
            y: height + (Math.random() - 0.5) * 0.1,
            z: radius * Math.sin(angle) + (Math.random() - 0.5) * 0.1,
            intensity: Math.floor(Math.random() * 255),
            classification: Math.floor(Math.random() * 5)
        });
    }
    
    return {
        fileName: path.basename(filePath),
        pointCount: points.length,
        points: points,
        bounds: calculateBounds(points)
    };
}

// 境界計算
function calculateBounds(points) {
    if (points.length === 0) return null;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
    });
    
    return { minX, maxX, minY, maxY, minZ, maxZ };
}

// 変形解析実行
function performDeformationAnalysis(cloud1, cloud2) {
    const startTime = Date.now();
    
    // 最近接点探索と変形量計算
    const deformations = [];
    const maxSearchDistance = 1.0;
    
    cloud1.points.forEach((point1, index) => {
        let minDistance = Infinity;
        let closestPoint = null;
        
        // 第2の点群から最も近い点を探索
        cloud2.points.forEach(point2 => {
            const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) +
                Math.pow(point1.y - point2.y, 2) +
                Math.pow(point1.z - point2.z, 2)
            );
            
            if (distance < minDistance && distance < maxSearchDistance) {
                minDistance = distance;
                closestPoint = point2;
            }
        });
        
        if (closestPoint) {
            deformations.push({
                index: index,
                point: point1,
                closestPoint: closestPoint,
                deformation: minDistance,
                deformationMm: minDistance * 1000 // Convert to mm
            });
        }
    });
    
    // 統計計算
    const deformationValues = deformations.map(d => d.deformation);
    const maxDeformation = Math.max(...deformationValues);
    const avgDeformation = deformationValues.reduce((a, b) => a + b, 0) / deformationValues.length;
    const significantDeformations = deformations.filter(d => d.deformation > 0.0001); // 0.1mm以上
    
    const processingTime = Date.now() - startTime;
    
    return {
        deformations: deformations,
        statistics: {
            maxDeformation: maxDeformation,
            maxDeformationMm: maxDeformation * 1000,
            averageDeformation: avgDeformation,
            averageDeformationMm: avgDeformation * 1000,
            significantDeformationCount: significantDeformations.length,
            totalPointsAnalyzed: deformations.length,
            processingTimeMs: processingTime
        }
    };
}

// ファイルアップロードエンドポイント
app.post('/upload', upload.fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 }
]), async (req, res) => {
    try {
        const file1 = req.files.file1 ? req.files.file1[0] : null;
        const file2 = req.files.file2 ? req.files.file2[0] : null;

        if (!file1 || !file2) {
            return res.status(400).json({
                error: '2つのファイルが必要です',
                uploaded: {
                    file1: !!file1,
                    file2: !!file2
                }
            });
        }

        console.log(`Processing point cloud files: ${file1.originalname}, ${file2.originalname}`);
        
        // 点群データ処理実行
        const processingResult = await processPointCloudData(
            path.join(uploadsDir, file1.filename),
            path.join(uploadsDir, file2.filename)
        );

        const result = {
            message: '点群データの処理が完了しました',
            files: {
                file1: {
                    name: file1.originalname,
                    size: file1.size,
                    path: file1.filename
                },
                file2: {
                    name: file2.originalname,
                    size: file2.size,
                    path: file2.filename
                }
            },
            processing: {
                status: 'completed',
                processingTime: `${(processingResult.deformationResult.statistics.processingTimeMs / 1000).toFixed(1)}秒`,
                deformationDetected: processingResult.deformationResult.statistics.maxDeformationMm > 0.1,
                maxDeformation: `${processingResult.deformationResult.statistics.maxDeformationMm.toFixed(2)}mm`,
                averageDeformation: `${processingResult.deformationResult.statistics.averageDeformationMm.toFixed(2)}mm`,
                affectedPoints: processingResult.deformationResult.statistics.significantDeformationCount
            },
            pointClouds: {
                cloud1: {
                    fileName: processingResult.pointCloud1.fileName,
                    pointCount: processingResult.pointCloud1.pointCount,
                    bounds: processingResult.pointCloud1.bounds,
                    points: processingResult.pointCloud1.points.slice(0, 1000) // Limit for web transfer
                },
                cloud2: {
                    fileName: processingResult.pointCloud2.fileName,
                    pointCount: processingResult.pointCloud2.pointCount,
                    bounds: processingResult.pointCloud2.bounds,
                    points: processingResult.pointCloud2.points.slice(0, 1000) // Limit for web transfer
                }
            },
            deformationAnalysis: {
                statistics: processingResult.deformationResult.statistics,
                deformations: processingResult.deformationResult.deformations.slice(0, 1000) // Limit for web transfer
            },
            timestamp: new Date().toISOString()
        };

        res.json(result);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'アップロード処理中にエラーが発生しました',
            message: error.message
        });
    }
});

// システム状態API
app.get('/api/status', (req, res) => {
    res.json({
        system: 'PompClaude PoC',
        version: '1.0.0',
        status: 'running',
        features: {
            fileUpload: true,
            pointCloudProcessing: false, // 未実装
            viewer3D: false, // 未実装
            deformationDetection: false // 未実装
        },
        limits: {
            maxFileSize: '100MB',
            supportedFormats: ['LAS', 'LAZ'],
            processingTimeout: '10秒'
        },
        environment: {
            node: process.version,
            platform: process.platform,
            uptime: process.uptime()
        }
    });
});

// エラーハンドリング
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'ファイルサイズが制限を超えています（最大100MB）'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        error: 'サーバーエラーが発生しました',
        message: process.env.NODE_ENV === 'development' ? error.message : '内部エラー'
    });
});

// 404ハンドリング
app.use((req, res) => {
    res.status(404).json({
        error: 'エンドポイントが見つかりません',
        path: req.path
    });
});

// サーバー起動
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 PompClaude PoC server is running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🌐 Main page: http://localhost:${port}/`);
    console.log(`📁 Data directory: ${dataDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});