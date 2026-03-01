export default {
    name: 'Fermenting',
    label: 'fermenting',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Glass vessel (wireframe cylinder)
        var vesselGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.45, 12, 1, true);
        var vesselMat = new THREE.MeshBasicMaterial({
            color: 0x88ccff, transparent: true, opacity: 0,
            wireframe: true
        });
        this._vessel = new THREE.Mesh(vesselGeo, vesselMat);
        this._vessel.position.set(ox - 0.35, oy - 0.1, 0);
        scene.add(this._vessel);

        // Vessel bottom cap
        var bottomGeo = new THREE.CircleGeometry(0.15, 12);
        var bottomMat = new THREE.MeshBasicMaterial({
            color: 0x88ccff, transparent: true, opacity: 0,
            wireframe: true, side: THREE.DoubleSide
        });
        this._bottom = new THREE.Mesh(bottomGeo, bottomMat);
        this._bottom.position.set(ox - 0.35, oy - 0.325, 0);
        this._bottom.rotation.x = Math.PI * 0.5;
        scene.add(this._bottom);

        // Liquid fill (solid cylinder inside, slightly smaller)
        var liquidGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12);
        var liquidMat = new THREE.MeshBasicMaterial({
            color: 0xddaa33, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._liquid = new THREE.Mesh(liquidGeo, liquidMat);
        this._liquid.position.set(ox - 0.35, oy - 0.18, 0);
        scene.add(this._liquid);

        // Cork stopper
        var corkGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.06, 8);
        var corkMat = new THREE.MeshBasicMaterial({
            color: 0xaa8855, transparent: true, opacity: 0
        });
        this._cork = new THREE.Mesh(corkGeo, corkMat);
        this._cork.position.set(ox - 0.35, oy + 0.14, 0);
        scene.add(this._cork);
        this._corkPopped = false;
        this._corkVY = 0;

        // Bubbles (slow rising inside vessel)
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var i = 0; i < 30; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffdd66 : (i % 3 === 1 ? 0xffcc33 : 0xeecc55),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub, life: 0, maxLife: 0,
                vx: 0, vy: 0, wobblePhase: Math.random() * Math.PI * 2
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // Foam burst particles
        this._foam = [];
        var foamGeo = new THREE.SphereGeometry(0.025, 5, 5);
        for (var f = 0; f < 20; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: f % 2 === 0 ? 0xffffee : 0xffeecc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(foamGeo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._foam.push({
                mesh: fMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._foamIdx = 0;

        // Pressure glow (inside vessel, grows with fermentation)
        var pressGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var pressMat = new THREE.MeshBasicMaterial({
            color: 0xffaa22, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._pressureGlow = new THREE.Mesh(pressGeo, pressMat);
        this._pressureGlow.position.set(ox - 0.35, oy - 0.05, 0);
        scene.add(this._pressureGlow);
    },
    _spawnBubble(x, bottomY, speed) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(
            x + (Math.random() - 0.5) * 0.18,
            bottomY,
            (Math.random() - 0.5) * 0.08
        );
        b.vx = (Math.random() - 0.5) * 0.05;
        b.vy = speed;
        b.life = 1.0 + Math.random() * 1.0;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.6;
        b.mesh.scale.setScalar(0.5 + Math.random() * 0.8);
    },
    _burstFoam(x, y) {
        for (var i = 0; i < 8; i++) {
            var f = this._foam[this._foamIdx % this._foam.length];
            this._foamIdx++;
            f.mesh.visible = true;
            f.mesh.position.set(x, y, 0);
            var angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
            var spd = 1.5 + Math.random() * 2.0;
            f.vx = Math.cos(angle) * spd * 0.5;
            f.vy = Math.sin(angle) * spd * 0.5 + 1.5;
            f.vz = (Math.random() - 0.5) * 0.8;
            f.life = 0.5 + Math.random() * 0.4;
            f.maxLife = f.life;
            f.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var vesselX = ox - 0.35;
        var vesselBottomY = oy - 0.32;

        if (progress < 0.08) {
            // Phase 1: Vessel appears
            var t = progress / 0.08;
            var ease = t * t;
            this._vessel.material.opacity = ease * 0.5;
            this._bottom.material.opacity = ease * 0.4;
            this._liquid.material.opacity = ease * 0.25;
            this._cork.material.opacity = ease * 0.7;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Slow bubbles start
            var t2 = (progress - 0.08) / 0.22;
            this._vessel.material.opacity = 0.5;
            this._bottom.material.opacity = 0.4;
            this._liquid.material.opacity = 0.25 + t2 * 0.05;
            this._cork.material.opacity = 0.7;

            // Slow bubble spawning
            if (time - this._lastBub > 0.4 - t2 * 0.15) {
                this._spawnBubble(vesselX, vesselBottomY, 0.15 + t2 * 0.1);
                this._lastBub = time;
            }

            // Slight pressure glow
            this._pressureGlow.material.opacity = t2 * 0.05;

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.60) {
            // Phase 3: Accelerating bubbles, vessel shakes
            var t3 = (progress - 0.30) / 0.30;
            this._liquid.material.opacity = 0.3 + t3 * 0.1;

            // Faster bubbles
            if (time - this._lastBub > 0.18 - t3 * 0.1) {
                this._spawnBubble(vesselX, vesselBottomY, 0.25 + t3 * 0.15);
                if (t3 > 0.5) {
                    this._spawnBubble(vesselX, vesselBottomY, 0.2);
                }
                this._lastBub = time;
            }

            // Vessel shakes with building pressure
            var shake = t3 * 0.012;
            this._vessel.position.x = vesselX + Math.sin(time * 15) * shake;
            this._bottom.position.x = vesselX + Math.sin(time * 15) * shake;
            this._liquid.position.x = vesselX + Math.sin(time * 15) * shake;
            this._cork.position.x = vesselX + Math.sin(time * 15) * shake;

            // Pressure glow builds
            this._pressureGlow.material.opacity = 0.05 + t3 * 0.15;
            this._pressureGlow.scale.setScalar(1 + t3 * 0.3);
            this._pressureGlow.position.x = vesselX + Math.sin(time * 15) * shake;

            // Liquid expands slightly (bubbles make it frothy)
            this._liquid.scale.y = 1 + t3 * 0.15;

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = Math.sin(time * 2) * 0.02;
        } else if (progress < 0.80) {
            // Phase 4: Pressure builds, model bounces
            var t4 = (progress - 0.60) / 0.20;
            this._liquid.material.opacity = 0.4 + Math.sin(time * 6) * 0.05;

            // More bubbles
            if (time - this._lastBub > 0.06) {
                this._spawnBubble(vesselX, vesselBottomY, 0.35 + t4 * 0.15);
                this._spawnBubble(vesselX, vesselBottomY, 0.3);
                this._lastBub = time;
            }

            // Stronger vessel shake
            var shakeIntense = 0.015 + t4 * 0.01;
            this._vessel.position.x = vesselX + Math.sin(time * 20) * shakeIntense;
            this._bottom.position.x = vesselX + Math.sin(time * 20) * shakeIntense;
            this._liquid.position.x = vesselX + Math.sin(time * 20) * shakeIntense;
            this._cork.position.x = vesselX + Math.sin(time * 20) * shakeIntense;
            this._pressureGlow.position.x = vesselX + Math.sin(time * 20) * shakeIntense;

            // Cork wobbles
            this._cork.position.y = oy + 0.14 + t4 * 0.02 + Math.sin(time * 12) * 0.005;

            // Pressure glow intensifies
            this._pressureGlow.material.opacity = 0.2 + t4 * 0.15 + Math.sin(time * 8) * 0.05;
            this._pressureGlow.scale.setScalar(1.3 + t4 * 0.3);

            // Liquid bulges
            this._liquid.scale.y = 1.15 + t4 * 0.1;
            this._liquid.scale.x = 1 + Math.sin(time * 10) * 0.03;

            // Model bounces nervously
            model.position.set(
                ox + 0.15 + Math.sin(time * 4) * 0.02,
                oy + Math.abs(Math.sin(time * 3)) * 0.04,
                oz
            );
            model.rotation.z = Math.sin(time * 3) * 0.05;
        } else if (progress < 0.92) {
            // Phase 5: Cork pop explosion of foam
            var t5 = (progress - 0.80) / 0.12;

            // Cork pops off
            if (!this._corkPopped) {
                this._corkPopped = true;
                this._corkVY = 3.0;
                this._burstFoam(vesselX, oy + 0.15);
            }
            this._cork.position.y += this._corkVY * delta;
            this._corkVY -= 5 * delta;
            this._cork.rotation.z += delta * 8;
            this._cork.material.opacity = Math.max(0, 0.7 - t5 * 0.8);

            // Vessel stops shaking
            this._vessel.position.x = vesselX;
            this._bottom.position.x = vesselX;
            this._liquid.position.x = vesselX;
            this._pressureGlow.position.x = vesselX;

            // Foam continues bursting
            if (t5 < 0.4 && Math.random() < 0.2) {
                this._burstFoam(vesselX, oy + 0.12);
            }

            // Pressure releases
            this._pressureGlow.material.opacity = 0.35 * (1 - t5);
            this._pressureGlow.scale.setScalar(1.6 + t5 * 0.5);

            // Liquid settles
            this._liquid.scale.y = 1.25 - t5 * 0.25;
            this._liquid.scale.x = 1;

            // Spawn celebratory bubbles upward from top
            if (t5 < 0.6 && time - this._lastBub > 0.05) {
                this._spawnBubble(vesselX, oy + 0.1, 0.8 + Math.random() * 0.5);
                this._lastBub = time;
            }

            model.position.set(ox + 0.15 + (1 - t5) * 0.03, oy, oz);
            model.rotation.z = (1 - t5) * -0.06;
        } else {
            // Phase 6: Settle
            var t6 = (progress - 0.92) / 0.08;
            this._vessel.material.opacity = 0.5 * (1 - t6);
            this._bottom.material.opacity = 0.4 * (1 - t6);
            this._liquid.material.opacity = 0.4 * (1 - t6);
            this._cork.material.opacity = 0;
            this._pressureGlow.material.opacity = 0;

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            // Gentle wobble
            bb.mesh.position.x += Math.sin(time * 5 + bb.wobblePhase) * 0.001;
            var lr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = lr * 0.5;
        }

        // Update foam
        for (var fi = 0; fi < this._foam.length; fi++) {
            var ff = this._foam[fi];
            if (ff.life <= 0) continue;
            ff.life -= delta;
            if (ff.life <= 0) { ff.mesh.visible = false; continue; }
            ff.mesh.position.x += ff.vx * delta;
            ff.mesh.position.y += ff.vy * delta;
            ff.mesh.position.z += ff.vz * delta;
            ff.vy -= 3 * delta;
            var flr = ff.life / ff.maxLife;
            ff.mesh.material.opacity = flr * 0.7;
            ff.mesh.scale.setScalar(0.5 + (1 - flr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._vessel) { scene.remove(this._vessel); this._vessel.geometry.dispose(); this._vessel.material.dispose(); }
        if (this._bottom) { scene.remove(this._bottom); this._bottom.geometry.dispose(); this._bottom.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._cork) { scene.remove(this._cork); this._cork.geometry.dispose(); this._cork.material.dispose(); }
        if (this._pressureGlow) { scene.remove(this._pressureGlow); this._pressureGlow.geometry.dispose(); this._pressureGlow.material.dispose(); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._foam) { this._foam.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        this._vessel = this._bottom = this._liquid = this._cork = this._pressureGlow = this._bubbles = this._foam = null;
    }
};
