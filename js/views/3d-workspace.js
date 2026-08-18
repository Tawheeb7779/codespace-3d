/**
 * 3D Workspace View
 * Three.js based 3D visualization of project structure
 */

import { BaseView } from './base-view.js';

export class ThreeDView extends BaseView {
    async render(params = {}) {
        const project = this.app.projectManager.currentProject;

        if (!project) {
            return this.showError('No project selected');
        }

        const container = document.createElement('div');
        container.className = 'w-full flex flex-col';

        // Header
        container.appendChild(this.renderHeader(project));

        // 3D area
        const threeDArea = document.createElement('div');
        threeDArea.className = 'flex-1 p-lg';

        const threeDContainer = document.createElement('div');
        threeDContainer.className = 'w-full h-full glass-panel rounded-xl overflow-hidden flex items-center justify-center bg-surface';
        threeDContainer.id = 'three-d-container';

        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            threeDContainer.innerHTML = `
                <div class="text-center">
                    <span class="material-symbols-outlined text-6xl text-outline mb-4 block">view_in_ar</span>
                    <p class="text-on-surface-variant">3D visualization module loading...</p>
                    <p class="text-xs text-on-surface-variant mt-2">Three.js library not yet loaded</p>
                </div>
            `;
        } else {
            this.initializeThreeD(threeDContainer, project);
        }

        threeDArea.appendChild(threeDContainer);
        container.appendChild(threeDArea);

        return container;
    }

    renderHeader(project) {
        const header = document.createElement('div');
        header.className = 'glass-panel border-b border-outline-variant/10 p-lg';

        header.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="material-symbols-outlined text-primary text-xl">view_in_ar</span>
                <div>
                    <h2 class="font-headline-md text-on-surface">3D Workspace</h2>
                    <p class="text-xs text-on-surface-variant font-code-sm">Project structure visualization</p>
                </div>
            </div>
        `;

        return header;
    }

    initializeThreeD(container, project) {
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0e131d);

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Create project structure visualization
        this.createProjectVisualization(scene, project);

        // Lighting
        const light = new THREE.DirectionalLight(0xadc6ff, 0.8);
        light.position.set(5, 5, 5);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x8c909f, 0.4);
        scene.add(ambientLight);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
    }

    createProjectVisualization(scene, project) {
        // Create a cube for each file
        const files = project.files || [];
        const spacing = 3;
        const startX = -(files.length * spacing) / 2;

        files.forEach((file, index) => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshPhongMaterial({
                color: 0xadc6ff,
                emissive: 0x4d8eff,
                shininess: 100,
            });

            const cube = new THREE.Mesh(geometry, material);
            cube.position.x = startX + index * spacing;
            cube.position.y = (Math.sin(index) * 2);
            cube.rotation.x = Math.random();
            cube.rotation.y = Math.random();

            // Animate
            const animate = () => {
                cube.rotation.x += 0.001;
                cube.rotation.y += 0.002;
            };
            setInterval(animate, 16);

            scene.add(cube);
        });
    }
}
