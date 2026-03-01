export default {
    name: 'Imagining',
    label: 'imagining',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Thought cloud (translucent sphere above model)
        var cloudGeo = new THREE.SphereGeometry(0.15, 14, 14);
        var cloudMat = new THREE.MeshBasicMaterial({
            color: 0xddccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._cloud = new THREE.Mesh(cloudGeo, cloudMat);
        this._cloud.position.set(ox - 0.1, oy + 0.2, 0);
        scene.add(this._cloud);

        // Small connecting thought bubbles
        this._thoughtBubbles = [];
        var bubbleSizes = [0.02, 0.03, 0.04];
        var bubbleYs = [0.05, 0.09, 0.14];
        for (var bi = 0; bi < 3; bi++) {
            var bbGeo = new THREE.SphereGeometry(bubbleSizes[bi], 8, 8);
            var bbMat = new THREE.MeshBasicMaterial({
                color: 0xccbbee, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bb = new THREE.Mesh(bbGeo, bbMat);
            bb.position.set(ox - 0.02 - bi * 0.03, oy + bubbleYs[bi], 0.01);
            scene.add(bb);
            this._thoughtBubbles.push(bb);
        }

        // Miniature scene inside the cloud (tiny shapes forming a landscape)
        this._miniScene = [];
        // Ground plane
        var groundGeo = new THREE.BoxGeometry(0.18, 0.01, 0.08);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0x88bb66, transparent: true, opacity: 0
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.set(ox - 0.1, oy + 0.15, 0.01);
        ground.visible = false;
        scene.add(ground);
        this._miniScene.push({ mesh: ground, type: 'ground' });

        // Buildings (small boxes)
        var buildingDefs = [
            { x: -0.05, w: 0.025, h: 0.04, color: 0x8899aa },
            { x: -0.02, w: 0.02, h: 0.06, color: 0x99aabb },
            { x: 0.01, w: 0.03, h: 0.035, color: 0x7788aa },
            { x: 0.05, w: 0.02, h: 0.05, color: 0xaabbcc }
        ];
        for (var bdi = 0; bdi < buildingDefs.length; bdi++) {
            var bldGeo = new THREE.BoxGeometry(buildingDefs[bdi].w, buildingDefs[bdi].h, 0.02);
            var bldMat = new THREE.MeshBasicMaterial({
                color: buildingDefs[bdi].color, transparent: true, opacity: 0
            });
            var bld = new THREE.Mesh(bldGeo, bldMat);
            bld.position.set(
                ox - 0.1 + buildingDefs[bdi].x,
                oy + 0.16 + buildingDefs[bdi].h * 0.5,
                0.02
            );
            bld.visible = false;
            scene.add(bld);
            this._miniScene.push({ mesh: bld, type: 'building', delay: bdi * 0.05 });
        }

        // Trees (cone + cylinder)
        var treeDefs = [
            { x: -0.08 }, { x: 0.06 }, { x: -0.13 }
        ];
        for (var ti = 0; ti < treeDefs.length; ti++) {
            var trunkGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4);
            var trunkMat = new THREE.MeshBasicMaterial({
                color: 0x886644, transparent: true, opacity: 0
            });
            var trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(ox - 0.1 + treeDefs[ti].x, oy + 0.165, 0.02);
            trunk.visible = false;
            scene.add(trunk);

            var canopyGeo = new THREE.ConeGeometry(0.012, 0.025, 6);
            var canopyMat = new THREE.MeshBasicMaterial({
                color: 0x44aa44, transparent: true, opacity: 0
            });
            var canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.set(ox - 0.1 + treeDefs[ti].x, oy + 0.185, 0.02);
            canopy.visible = false;
            scene.add(canopy);

            this._miniScene.push({ mesh: trunk, type: 'tree', delay: 0.15 + ti * 0.04 });
            this._miniScene.push({ mesh: canopy, type: 'tree', delay: 0.15 + ti * 0.04 });
        }

        // Sun (small sphere)
        var sunGeo = new THREE.SphereGeometry(0.012, 8, 8);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._sun = new THREE.Mesh(sunGeo, sunMat);
        this._sun.position.set(ox - 0.02, oy + 0.28, 0.02);
        this._sun.visible = false;
        scene.add(this._sun);

        // Color bleed particles (escape from cloud outward)
        this._colorParticles = [];
        var cpGeo = new THREE.SphereGeometry(0.01, 4, 4);
        var pastelColors = [0xffbbcc, 0xbbddff, 0xccffbb, 0xffffbb, 0xddbbff,
                           0xffddbb, 0xbbffee, 0xffbbff];
        for (var ci = 0; ci < 25; ci++) {
            var cpMat = new THREE.MeshBasicMaterial({
                color: pastelColors[ci % pastelColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cp = new THREE.Mesh(cpGeo, cpMat);
            cp.visible = false;
            scene.add(cp);
            this._colorParticles.push({
                mesh: cp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._cpIdx = 0;

        // Dream glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xddbbff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.1, oy + 0.2, -0.05);
        scene.add(this._glow);
    },
    _emitColor(x, y) {
        var c = this._colorParticles[this._cpIdx % this._colorParticles.length];
        this._cpIdx++;
        c.mesh.visible = true;
        c.mesh.position.set(x, y, 0.02);
        var a = Math.random() * Math.PI * 2;
        c.vx = Math.cos(a) * (0.2 + Math.random() * 0.4);
        c.vy = Math.sin(a) * (0.2 + Math.random() * 0.4);
        c.life = 0.5 + Math.random() * 0.5;
        c.maxLife = c.life;
        c.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Thought bubbles and cloud appear
            var t = progress / 0.10;
            for (var bi = 0; bi < this._thoughtBubbles.length; bi++) {
                var bDelay = bi * 0.2;
                var bT = Math.max(0, Math.min(1, (t - bDelay) / 0.4));
                this._thoughtBubbles[bi].material.opacity = bT * 0.4;
                this._thoughtBubbles[bi].scale.setScalar(bT);
            }
            this._cloud.material.opacity = t * 0.2;
            this._cloud.scale.setScalar(0.5 + t * 0.5);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Miniature scene assembles inside cloud
            var t2 = (progress - 0.10) / 0.30;
            this._cloud.material.opacity = 0.2 + t2 * 0.1;

            for (var mi = 0; mi < this._miniScene.length; mi++) {
                var ms = this._miniScene[mi];
                var msDelay = ms.delay || 0;
                var msT = Math.max(0, Math.min(1, (t2 - msDelay) / 0.2));
                ms.mesh.visible = msT > 0;
                ms.mesh.material.opacity = msT * 0.5;
                ms.mesh.scale.setScalar(msT);
            }

            // Sun appears
            if (t2 > 0.5) {
                this._sun.visible = true;
                this._sun.material.opacity = (t2 - 0.5) * 2 * 0.6;
            }

            for (var tb = 0; tb < this._thoughtBubbles.length; tb++) {
                this._thoughtBubbles[tb].material.opacity = 0.4;
            }

            model.position.set(ox, oy + Math.sin(time * 1) * 0.003, oz);
        } else if (progress < 0.60) {
            // Phase 3: Cloud expands as imagination grows
            var t3 = (progress - 0.40) / 0.20;
            var cloudScale = 1.0 + t3 * 0.5;
            this._cloud.scale.setScalar(cloudScale);
            this._cloud.material.opacity = 0.3 + Math.sin(time * 2) * 0.05;

            // All mini scene fully visible
            for (var mi2 = 0; mi2 < this._miniScene.length; mi2++) {
                this._miniScene[mi2].mesh.material.opacity = 0.5 + Math.sin(time * 2 + mi2) * 0.1;
            }
            this._sun.material.opacity = 0.6 + Math.sin(time * 3) * 0.15;

            model.position.set(ox, oy + Math.sin(time * 1.2) * 0.005, oz);
        } else if (progress < 0.80) {
            // Phase 4: Details sharpen, color bleeds from cloud
            var t4 = (progress - 0.60) / 0.20;
            this._cloud.scale.setScalar(1.5 + t4 * 0.3);
            this._cloud.material.opacity = 0.3 + t4 * 0.1;

            // Mini scene gets more opaque
            for (var mi3 = 0; mi3 < this._miniScene.length; mi3++) {
                this._miniScene[mi3].mesh.material.opacity = 0.6 + t4 * 0.2;
            }

            // Color bleed particles escape
            if (Math.random() < 0.06 + t4 * 0.08) {
                var cloudX = ox - 0.1 + (Math.random() - 0.5) * 0.2;
                var cloudY = oy + 0.2 + (Math.random() - 0.5) * 0.15;
                this._emitColor(cloudX, cloudY);
            }

            // Pastel glow
            this._glow.material.opacity = t4 * 0.1;
            this._glow.scale.setScalar(1 + t4 * 0.5);

            model.position.set(ox, oy + Math.sin(time * 1) * 0.004, oz);
        } else if (progress < 0.90) {
            // Phase 5: Full imagination, everything vivid
            var t5 = (progress - 0.80) / 0.10;
            var dreamPulse = Math.sin(t5 * Math.PI * 3);

            this._cloud.scale.setScalar(1.8 + dreamPulse * 0.1);
            this._cloud.material.opacity = 0.4 + dreamPulse * 0.1;

            for (var mi4 = 0; mi4 < this._miniScene.length; mi4++) {
                this._miniScene[mi4].mesh.material.opacity = 0.8 + dreamPulse * 0.1;
            }

            // Heavy color bleed
            if (Math.random() < 0.12) {
                this._emitColor(
                    ox - 0.1 + (Math.random() - 0.5) * 0.25,
                    oy + 0.2 + (Math.random() - 0.5) * 0.2
                );
            }

            this._glow.material.opacity = 0.1 + dreamPulse * 0.05;
            model.position.set(ox, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t6;
            this._cloud.material.opacity *= fadeOut;
            for (var tb2 = 0; tb2 < this._thoughtBubbles.length; tb2++) {
                this._thoughtBubbles[tb2].material.opacity *= fadeOut;
            }
            for (var mi5 = 0; mi5 < this._miniScene.length; mi5++) {
                this._miniScene[mi5].mesh.material.opacity *= fadeOut;
            }
            if (this._sun) this._sun.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update color particles
        for (var ci = 0; ci < this._colorParticles.length; ci++) {
            var cp = this._colorParticles[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            var lr = cp.life / cp.maxLife;
            cp.mesh.material.opacity = lr * 0.4;
            cp.mesh.scale.setScalar(0.5 + (1 - lr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cloud) { scene.remove(this._cloud); this._cloud.geometry.dispose(); this._cloud.material.dispose(); }
        if (this._thoughtBubbles) {
            this._thoughtBubbles.forEach(function(b) { scene.remove(b); b.geometry.dispose(); b.material.dispose(); });
        }
        if (this._miniScene) {
            this._miniScene.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); });
        }
        if (this._sun) { scene.remove(this._sun); this._sun.geometry.dispose(); this._sun.material.dispose(); }
        if (this._colorParticles) {
            this._colorParticles.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._cloud = this._thoughtBubbles = this._miniScene = this._sun = this._colorParticles = this._glow = null;
    }
};
