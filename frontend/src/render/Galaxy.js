import * as THREE from 'three';

export class Galaxy {
    constructor(segments = 64, preloadedAssets = {}) {
        this.radius = 15000.0;
        this.segments = segments;
        this.preloadedAssets = preloadedAssets;
        this.mesh = this.createGalaxyMesh(this.radius, segments);
        // this.group = new THREE.Group(); --- IGNORE ---
        // this.group.add(this.mesh); --- IGNORE ---
    }

    createGalaxyMesh() {
        // Validate geometry parameters
        const safeRadius = (typeof this.radius === 'number' && isFinite(this.radius) && this.radius > 0) ? this.radius : 10000;
        const safeSegments = (typeof this.segments === 'number' && isFinite(this.segments) && this.segments > 0) ? this.segments : 64;
        const geometry = new THREE.SphereGeometry(safeRadius, safeSegments, safeSegments);

        // Defensive texture loading
        let galaxyTexture = null;
        try {
            galaxyTexture = this.preloadedAssets['/resources/galaxy/Galaxy Map.jpg'];
            if (!galaxyTexture) {
                const textureLoader = new THREE.TextureLoader();
                galaxyTexture = textureLoader.load(
                    '/resources/galaxy/Galaxy Map.jpg',
                    undefined,
                    undefined,
                    (err) => {
                        console.error('Failed to load galaxy texture:', err);
                    }
                );
            }
        } catch (err) {
            console.error('Error loading galaxy texture:', err);
            galaxyTexture = null;
        }

        let material;
        if (!galaxyTexture) {
            // Fallback: use a solid color material
            material = new THREE.MeshBasicMaterial({ color: 0x222244, side: THREE.BackSide });
        } else {
            // Configure texture settings for better quality
            galaxyTexture.wrapS = THREE.RepeatWrapping;
            galaxyTexture.wrapT = THREE.RepeatWrapping;
            galaxyTexture.colorSpace = THREE.SRGBColorSpace;
            galaxyTexture.magFilter = THREE.LinearFilter;
            galaxyTexture.minFilter = THREE.LinearFilter;
            material = new THREE.MeshBasicMaterial({
                map: galaxyTexture,
                side: THREE.BackSide, // Render inside faces so we see it from inside the sphere
                transparent: false, // Make it opaque to avoid blending issues
                fog: false, // Skybox should not be affected by fog
                depthWrite: false, // Don't write to depth buffer
                depthTest: true, // Disable depth test to always render behind
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        
        // Ensure galaxy doesn't cast or receive shadows
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        
        // Position galaxy at origin so it's truly a background skybox
        mesh.position.set(0, 0, 0);
        
        // Set very negative render order to ensure it renders first (behind everything)
        mesh.renderOrder = -9999;
        
        // Make sure it doesn't interfere with other objects
        mesh.frustumCulled = false;
        
        return mesh;
    }
}