class PointCloudViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pointCloud1 = null;
        this.pointCloud2 = null;
        this.deformationCloud = null;
        this.colorBar = null;
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 20);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls setup (OrbitControls equivalent)
        this.setupControls();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Grid helper
        const grid = new THREE.GridHelper(20, 20);
        this.scene.add(grid);

        // Axes helper
        const axes = new THREE.AxesHelper(5);
        this.scene.add(axes);

        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start rendering
        this.animate();
    }

    setupControls() {
        // Basic mouse controls implementation
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!isMouseDown) return;

            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;

            // Rotate camera around scene
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(this.camera.position);
            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

            this.camera.position.setFromSpherical(spherical);
            this.camera.lookAt(0, 0, 0);

            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (event) => {
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);
        });
    }

    loadPointCloudData(data1, data2) {
        console.log('Loading point cloud data...');
        
        // Clear existing point clouds
        this.clearPointClouds();

        // Create point clouds from data
        if (data1 && data1.points) {
            this.pointCloud1 = this.createPointCloud(data1.points, 0x0066cc, 'Point Cloud 1');
            this.scene.add(this.pointCloud1);
        }

        if (data2 && data2.points) {
            this.pointCloud2 = this.createPointCloud(data2.points, 0xcc6600, 'Point Cloud 2');
            this.scene.add(this.pointCloud2);
        }

        // Perform deformation detection
        if (data1 && data2) {
            this.performDeformationDetection(data1, data2);
        }
    }

    createPointCloud(points, color, name) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);

        for (let i = 0; i < points.length; i++) {
            positions[i * 3] = points[i].x;
            positions[i * 3 + 1] = points[i].y;
            positions[i * 3 + 2] = points[i].z;

            const colorObj = new THREE.Color(color);
            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const pointCloud = new THREE.Points(geometry, material);
        pointCloud.name = name;

        return pointCloud;
    }

    performDeformationDetection(data1, data2) {
        console.log('Performing deformation detection...');

        const deformations = this.calculateDeformations(data1.points, data2.points);
        
        // Create deformation visualization
        this.createDeformationVisualization(data1.points, deformations);
        
        // Update statistics
        this.updateDeformationStats(deformations);
    }

    calculateDeformations(points1, points2) {
        const deformations = [];
        const maxDistance = 2.0; // Maximum distance to consider for matching

        for (let i = 0; i < points1.length; i++) {
            const p1 = points1[i];
            let minDistance = Infinity;
            let closestPoint = null;

            // Find closest point in second cloud
            for (let j = 0; j < points2.length; j++) {
                const p2 = points2[j];
                const distance = Math.sqrt(
                    Math.pow(p1.x - p2.x, 2) +
                    Math.pow(p1.y - p2.y, 2) +
                    Math.pow(p1.z - p2.z, 2)
                );

                if (distance < minDistance && distance < maxDistance) {
                    minDistance = distance;
                    closestPoint = p2;
                }
            }

            deformations.push({
                point: p1,
                deformation: minDistance < maxDistance ? minDistance : 0,
                matched: closestPoint !== null
            });
        }

        return deformations;
    }

    createDeformationVisualization(points, deformations) {
        // Remove existing deformation cloud
        if (this.deformationCloud) {
            this.scene.remove(this.deformationCloud);
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);

        // Calculate max deformation for color scaling
        const maxDeformation = Math.max(...deformations.map(d => d.deformation));

        for (let i = 0; i < points.length; i++) {
            positions[i * 3] = points[i].x;
            positions[i * 3 + 1] = points[i].y;
            positions[i * 3 + 2] = points[i].z;

            // Color based on deformation amount (blue = no deformation, red = max deformation)
            const deformationRatio = deformations[i].deformation / maxDeformation;
            const color = new THREE.Color();
            color.setHSL((1 - deformationRatio) * 0.7, 1, 0.5); // Blue to red

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true
        });

        this.deformationCloud = new THREE.Points(geometry, material);
        this.deformationCloud.name = 'Deformation Analysis';
        this.scene.add(this.deformationCloud);

        // Hide original point clouds
        if (this.pointCloud1) this.pointCloud1.visible = false;
        if (this.pointCloud2) this.pointCloud2.visible = false;
    }

    updateDeformationStats(deformations) {
        const validDeformations = deformations.filter(d => d.matched);
        const deformationValues = validDeformations.map(d => d.deformation);
        
        const maxDeformation = Math.max(...deformationValues);
        const avgDeformation = deformationValues.reduce((a, b) => a + b, 0) / deformationValues.length;
        const significantDeformations = deformationValues.filter(d => d > 0.1).length;

        const statsElement = document.getElementById('deformation-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <h4>変形検出結果</h4>
                <p><strong>最大変形量:</strong> ${(maxDeformation * 1000).toFixed(1)}mm</p>
                <p><strong>平均変形量:</strong> ${(avgDeformation * 1000).toFixed(1)}mm</p>
                <p><strong>有意な変形点:</strong> ${significantDeformations}点</p>
                <p><strong>処理点数:</strong> ${validDeformations.length}点</p>
            `;
        }
    }

    clearPointClouds() {
        if (this.pointCloud1) {
            this.scene.remove(this.pointCloud1);
            this.pointCloud1 = null;
        }
        if (this.pointCloud2) {
            this.scene.remove(this.pointCloud2);
            this.pointCloud2 = null;
        }
        if (this.deformationCloud) {
            this.scene.remove(this.deformationCloud);
            this.deformationCloud = null;
        }
    }

    togglePointCloud(cloudNumber, visible) {
        const cloud = cloudNumber === 1 ? this.pointCloud1 : this.pointCloud2;
        if (cloud) {
            cloud.visible = visible;
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Mock point cloud data generator for testing
function generateMockPointCloudData(name, pointCount = 1000) {
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
        // Generate points in a sphere-like shape with some noise
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 3 + Math.random() * 2;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        points.push({
            x: x + (Math.random() - 0.5) * 0.5,
            y: y + (Math.random() - 0.5) * 0.5,
            z: z + (Math.random() - 0.5) * 0.5
        });
    }
    
    return {
        name: name,
        pointCount: points.length,
        points: points
    };
}