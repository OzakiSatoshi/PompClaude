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
                    <form action="/upload" method="post" enctype="multipart/form-data">
                        <div style="margin: 20px 0;">
                            <label for="file1">基準データ（撮影日1）:</label><br>
                            <input type="file" id="file1" name="file1" accept=".las,.laz" required>
                        </div>
                        <div style="margin: 20px 0;">
                            <label for="file2">比較データ（撮影日2）:</label><br>
                            <input type="file" id="file2" name="file2" accept=".las,.laz" required>
                        </div>
                        <button type="submit" style="background-color: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            変形検出を開始
                        </button>
                    </form>
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
        </body>
        </html>
    `);
});

// ファイルアップロードエンドポイント
app.post('/upload', upload.fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 }
]), (req, res) => {
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

        // 実際の点群処理はここで実装予定
        // 現在はモックレスポンスを返す
        const mockResult = {
            message: '点群データのアップロードが完了しました',
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
                processingTime: '2.3秒',
                deformationDetected: true,
                maxDeformation: '0.5mm',
                affectedPoints: 1247
            },
            timestamp: new Date().toISOString()
        };

        res.json(mockResult);

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