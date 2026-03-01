export default {
    name: 'Marinating',
    label: 'marinating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Bowl (half-sphere)
        var bowlGeo = new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        var bowlMat = new THREE.MeshBasicMaterial({
            color: 0x776655, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._bowl = new THREE.Mesh(bowlGeo, bowlMat);
        this._bowl.rotation.x = Math.PI;
        this._bowl.position.set(ox - 0.25, oy - 0.18, 0);
        scene.add(this._bowl);

        // Marinade liquid surface
        var liqGeo = new THREE.CircleGeometry(0.2, 16);
        var liqMat = new THREE.MeshBasicMaterial({
            color: 0xcc6622, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liqGeo, liqMat);
        this._liquid.position.set(ox - 0.25, oy - 0.16, 0);
        scene.add(this._liquid);

        // Food cube (submerged)
        var cubeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        var cubeMat = new THREE.MeshBasicMaterial({
            color: 0xddbbaa, transparent: true, opacity: 0
        });
        this._cube = new THREE.Mesh(cubeGeo, cubeMat);
        this._cube.position.set(ox - 0.25, oy - 0.2, 0);
        scene.add(this._cube);

        // Flavor particles (varied colors penetrating from outside in)
        this._flavor = [];
        var flavGeo = new THREE.SphereGeometry(0.01, 5, 5);
        var flavColors = [0xff6633, 0x33cc33, 0xffcc00, 0xff3366, 0x6633cc, 0xcc9900];
        for (var i = 0; i < 35; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: flavColors[i % flavColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(flavGeo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._flavor.push({
                mesh: fMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, targetX: 0, targetY: 0,
                startX: 0, startY: 0
            });
        }
        this._flavIdx = 0;

        // Timer torus
        var timerGeo = new THREE.TorusGeometry(0.08, 0.01, 8, 24);
        var timerMat = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._timer = new THREE.Mesh(timerGeo, timerMat);
        this._timer.position.set(ox + 0.15, oy + 0.15, 0);
        scene.add(this._timer);

        // Timer fill arc (ring segment showing progress)
        var timerFillGeo = new THREE.RingGeometry(0.06, 0.08, 24, 1, 0, 0.01);
        var timerFillMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._timerFill = new THREE.Mesh(timerFillGeo, timerFillMat);
        this._timerFill.position.set(ox + 0.15, oy + 0.15, 0.01);
        scene.add(this._timerFill);

        // Absorption glow around cube
        var absorbGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var absorbMat = new THREE.MeshBasicMaterial({
            color: 0xcc6622, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._absorbGlow = new THREE.Mesh(absorbGeo, absorbMat);
        this._absorbGlow.position.set(ox - 0.25, oy - 0.2, 0);
        scene.add(this._absorbGlow);

        this._cubeColorR = 0.87;
        this._cubeColorG = 0.73;
        this._cubeColorB = 0.67;
    },
    _spawnFlavor(cubeX, cubeY) {
        var f = this._flavor[this._flavIdx % this._flavor.length];
        this._flavIdx++;
        f.mesh.visible = true;
        // Start from around the liquid, target the cube
        var angle = Math.random() * Math.PI * 2;
        var startDist = 0.15 + Math.random() * 0.05;
        f.startX = cubeX + Math.cos(angle) * startDist;
        f.startY = cubeY + Math.sin(angle) * startDist * 0.5;
        f.targetX = cubeX + (Math.random() - 0.5) * 0.06;
        f.targetY = cubeY + (Math.random() - 0.5) * 0.06;
        f.mesh.position.set(f.startX, f.startY, 0);
        f.life = 1.5 + Math.random() * 1.0;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var cubeX = ox - 0.25;
        var cubeY = oy - 0.2;

        if (progress < 0.08) {
            // Phase 1: Bowl and liquid appear
            var t = progress / 0.08;
            var ease = t * t;
            this._bowl.material.opacity = ease * 0.7;
            this._liquid.material.opacity = ease * 0.4;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.18) {
            // Phase 2: Cube submerged
            var t2 = (progress - 0.08) / 0.10;
            this._bowl.material.opacity = 0.7;
            this._liquid.material.opacity = 0.4;
            this._cube.material.opacity = t2 * 0.8;

            // Cube sinks in
            this._cube.position.y = oy - 0.1 - t2 * 0.1;

            // Liquid ripple on submersion
            this._liquid.scale.setScalar(1 + Math.sin(t2 * Math.PI * 3) * 0.05 * (1 - t2));

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.75) {
            // Phase 3: Slow absorption - flavor particles penetrate
            var t3 = (progress - 0.18) / 0.57;
            this._cube.material.opacity = 0.8;

            // Timer rotates slowly
            this._timer.material.opacity = 0.4;
            this._timer.rotation.z = -time * 0.3;
            this._timerFill.material.opacity = 0.5;

            // Update timer fill arc
            if (this._timerFill.geometry) {
                this._timerFill.geometry.dispose();
            }
            var fillAngle = t3 * Math.PI * 2;
            this._timerFill.geometry = new THREE.RingGeometry(0.06, 0.08, 24, 1, 0, fillAngle);

            // Spawn flavor particles slowly
            if (Math.random() < 0.05 + t3 * 0.05) {
                this._spawnFlavor(cubeX, cubeY);
            }

            // Cube color gradient changes - absorbing marinade
            this._cubeColorR = 0.87 - t3 * 0.3;
            this._cubeColorG = 0.73 - t3 * 0.25;
            this._cubeColorB = 0.67 - t3 * 0.35;
            this._cube.material.color.setRGB(this._cubeColorR, this._cubeColorG, this._cubeColorB);

            // Absorption glow pulses
            this._absorbGlow.material.opacity = 0.1 + t3 * 0.15 + Math.sin(time * 2) * 0.05;
            this._absorbGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);

            // Liquid subtly shifts
            this._liquid.material.opacity = 0.4 + Math.sin(time * 1.5) * 0.05;

            // Model watches patiently
            model.position.set(ox + 0.15, oy + Math.sin(time * 0.8) * 0.01, oz);
            model.rotation.z = Math.sin(time * 0.5) * 0.02;
        } else if (progress < 0.88) {
            // Phase 4: Deep absorption complete
            var t4 = (progress - 0.75) / 0.13;

            // Cube fully marinated color
            this._cube.material.color.setRGB(0.57, 0.48, 0.32);

            // Absorption glow peaks
            this._absorbGlow.material.opacity = (0.25 + Math.sin(time * 3) * 0.08) * (1 - t4 * 0.3);

            // Timer complete
            this._timer.material.opacity = 0.4 * (1 - t4);
            this._timerFill.material.opacity = 0.5 * (1 - t4);

            // Last few flavor particles
            if (Math.random() < 0.03) {
                this._spawnFlavor(cubeX, cubeY);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.88) / 0.12;
            this._bowl.material.opacity = 0.7 * (1 - t5);
            this._liquid.material.opacity = 0.4 * (1 - t5);
            this._cube.material.opacity = 0.8 * (1 - t5);
            this._absorbGlow.material.opacity = 0.2 * (1 - t5);
            this._timer.material.opacity = 0;
            this._timerFill.material.opacity = 0;

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update flavor particles (move toward cube center)
        for (var fi = 0; fi < this._flavor.length; fi++) {
            var fp = this._flavor[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            var flr = fp.life / fp.maxLife;
            // Interpolate from start to target
            var tween = 1 - flr;
            fp.mesh.position.x = fp.startX + (fp.targetX - fp.startX) * tween;
            fp.mesh.position.y = fp.startY + (fp.targetY - fp.startY) * tween;
            // Spiral motion
            fp.mesh.position.x += Math.sin(time * 4 + fi) * 0.01 * flr;
            fp.mesh.position.y += Math.cos(time * 4 + fi) * 0.01 * flr;
            fp.mesh.material.opacity = (1 - tween * 0.5) * 0.4;
            fp.mesh.scale.setScalar(0.8 - tween * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bowl) { scene.remove(this._bowl); this._bowl.geometry.dispose(); this._bowl.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._cube) { scene.remove(this._cube); this._cube.geometry.dispose(); this._cube.material.dispose(); }
        if (this._timer) { scene.remove(this._timer); this._timer.geometry.dispose(); this._timer.material.dispose(); }
        if (this._timerFill) { scene.remove(this._timerFill); this._timerFill.geometry.dispose(); this._timerFill.material.dispose(); }
        if (this._absorbGlow) { scene.remove(this._absorbGlow); this._absorbGlow.geometry.dispose(); this._absorbGlow.material.dispose(); }
        if (this._flavor) { this._flavor.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        this._bowl = this._liquid = this._cube = this._timer = this._timerFill = this._absorbGlow = this._flavor = null;
    }
};
