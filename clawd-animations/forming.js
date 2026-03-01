export default {
    name: 'Forming',
    label: 'forming',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Potter's wheel (flat cylinder)
        var wheelGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.02, 20);
        var wheelMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._wheel = new THREE.Mesh(wheelGeo, wheelMat);
        this._wheel.position.set(ox - 0.15, oy - 0.25, 0);
        this._wheel.rotation.x = Math.PI * 0.5;
        scene.add(this._wheel);

        // Wheel base
        var baseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 12);
        var baseMat = new THREE.MeshBasicMaterial({
            color: 0x666666, transparent: true, opacity: 0
        });
        this._wheelBase = new THREE.Mesh(baseGeo, baseMat);
        this._wheelBase.position.set(ox - 0.15, oy - 0.30, 0);
        this._wheelBase.rotation.x = Math.PI * 0.5;
        scene.add(this._wheelBase);

        // Clay blob (sphere that deforms)
        var clayGeo = new THREE.SphereGeometry(0.08, 12, 12);
        var clayMat = new THREE.MeshBasicMaterial({
            color: 0x996644, transparent: true, opacity: 0
        });
        this._clay = new THREE.Mesh(clayGeo, clayMat);
        this._clay.position.set(ox - 0.15, oy - 0.20, 0.02);
        scene.add(this._clay);

        // Clay splatter particles
        this._splatters = [];
        var splatGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var i = 0; i < 20; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xaa7744 : (i % 3 === 1 ? 0x885533 : 0xbb8855),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var splat = new THREE.Mesh(splatGeo, sMat);
            splat.visible = false;
            scene.add(splat);
            this._splatters.push({
                mesh: splat, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._splatIdx = 0;
        this._lastSplat = 0;

        // Surface polish glow
        var glowGeo = new THREE.SphereGeometry(0.2, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xcc9966, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.15, oy - 0.15, -0.05);
        scene.add(this._glow);

        // Smooth surface shimmer ring
        var shimGeo = new THREE.TorusGeometry(0.1, 0.005, 8, 24);
        var shimMat = new THREE.MeshBasicMaterial({
            color: 0xddbb88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._shimmer = new THREE.Mesh(shimGeo, shimMat);
        this._shimmer.position.set(ox - 0.15, oy - 0.20, 0.03);
        this._shimmer.rotation.x = Math.PI * 0.5;
        scene.add(this._shimmer);

        this._wheelAngle = 0;
    },
    _emitSplat(x, y) {
        var s = this._splatters[this._splatIdx % this._splatters.length];
        this._splatIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.03);
        var a = Math.random() * Math.PI * 2;
        var spd = 0.3 + Math.random() * 0.5;
        s.vx = Math.cos(a) * spd;
        s.vy = Math.sin(a) * spd * 0.5;
        s.vz = Math.random() * 0.2;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var clayX = ox - 0.15;
        var clayY = oy - 0.20;

        // Wheel always spinning once active
        if (progress > 0.10) {
            this._wheelAngle += delta * (2 + progress * 4);
            this._wheel.rotation.z = this._wheelAngle;
        }

        if (progress < 0.10) {
            // Phase 1: Wheel and clay appear
            var t = progress / 0.10;
            var ease = t * t;
            this._wheel.material.opacity = ease * 0.5;
            this._wheelBase.material.opacity = ease * 0.4;
            this._clay.material.opacity = ease * 0.6;
            this._clay.scale.set(1, 0.7, 1);
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Raw clay blob, model pushes (blob squishes)
            var t2 = (progress - 0.10) / 0.20;
            this._wheel.material.opacity = 0.5;
            this._wheelBase.material.opacity = 0.4;
            this._clay.material.opacity = 0.6;

            // Clay squishes - width increases, height decreases
            var squish = Math.sin(time * 4) * 0.15;
            this._clay.scale.set(
                1.0 + t2 * 0.2 + squish,
                0.7 - t2 * 0.1 - squish * 0.5,
                1.0 + t2 * 0.1
            );

            // Splatters from molding
            if (time - this._lastSplat > 0.15 && Math.abs(squish) > 0.1) {
                this._emitSplat(clayX, clayY);
                this._lastSplat = time;
            }

            // Model moves near clay
            model.position.set(ox + 0.1, oy + Math.sin(time * 2) * 0.01, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.03;
        } else if (progress < 0.50) {
            // Phase 3: Potter's wheel spins, model orbits, clay refines
            var t3 = (progress - 0.30) / 0.20;

            // Clay gradually gets taller and narrower (vase shape)
            var narrowing = t3 * 0.3;
            var tallening = t3 * 0.5;
            this._clay.scale.set(
                1.2 - narrowing + Math.sin(time * 5) * 0.03,
                0.6 + tallening,
                1.1 - narrowing * 0.5
            );

            // Splatters
            if (time - this._lastSplat > 0.12) {
                this._emitSplat(clayX + (Math.random() - 0.5) * 0.05, clayY);
                this._lastSplat = time;
            }

            // Color warms slightly
            this._clay.material.color.setRGB(0.6 + t3 * 0.05, 0.4 + t3 * 0.03, 0.27 + t3 * 0.02);

            // Model orbits around wheel
            var orbitA = time * 1.5;
            model.position.set(
                ox + Math.cos(orbitA) * 0.12,
                oy + Math.sin(orbitA) * 0.03,
                oz
            );
            model.rotation.z = Math.sin(orbitA) * 0.04;
        } else if (progress < 0.70) {
            // Phase 4: Shape emerges, progressive refinement
            var t4 = (progress - 0.50) / 0.20;

            // More refined shape
            this._clay.scale.set(
                0.9 - t4 * 0.15 + Math.sin(time * 6) * 0.015,
                1.1 + t4 * 0.3,
                0.85 - t4 * 0.1
            );

            // Color refines toward terracotta
            this._clay.material.color.setRGB(0.65 + t4 * 0.1, 0.43 + t4 * 0.07, 0.29 + t4 * 0.05);

            // Fewer splatters now
            if (time - this._lastSplat > 0.25) {
                this._emitSplat(clayX, clayY);
                this._lastSplat = time;
            }

            // Shimmer ring appears
            this._shimmer.material.opacity = t4 * 0.3;
            this._shimmer.rotation.z = time * 2;

            var orbitA2 = time * 1.2;
            model.position.set(
                ox + Math.cos(orbitA2) * 0.1,
                oy + Math.sin(orbitA2) * 0.025,
                oz
            );
        } else if (progress < 0.88) {
            // Phase 5: Smooth surface glow, finished piece
            var t5 = (progress - 0.70) / 0.18;
            var pulse = Math.sin(t5 * Math.PI * 3);

            // Final elegant shape
            this._clay.scale.set(
                0.75 + pulse * 0.02,
                1.4 + pulse * 0.05,
                0.75 + pulse * 0.02
            );
            this._clay.material.color.setRGB(0.75, 0.5, 0.34);
            this._clay.material.opacity = 0.7 + pulse * 0.1;

            // Surface glow
            this._glow.material.opacity = t5 * 0.12 + pulse * 0.04;
            this._glow.scale.setScalar(1 + t5 * 0.3);

            // Shimmer ring pulses
            this._shimmer.material.opacity = 0.3 + pulse * 0.15;
            this._shimmer.scale.setScalar(1 + pulse * 0.2);
            this._shimmer.rotation.z = time * 1.5;

            model.position.set(ox + 0.1, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            var fadeOut = 1 - t6;
            this._wheel.material.opacity = 0.5 * fadeOut;
            this._wheelBase.material.opacity = 0.4 * fadeOut;
            this._clay.material.opacity = 0.7 * fadeOut;
            this._glow.material.opacity *= fadeOut;
            this._shimmer.material.opacity *= fadeOut;
            model.position.set(ox + 0.1 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update splatters
        for (var si = 0; si < this._splatters.length; si++) {
            var sp = this._splatters[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 2.0 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.5;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.3);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._wheel) { scene.remove(this._wheel); this._wheel.geometry.dispose(); this._wheel.material.dispose(); }
        if (this._wheelBase) { scene.remove(this._wheelBase); this._wheelBase.geometry.dispose(); this._wheelBase.material.dispose(); }
        if (this._clay) { scene.remove(this._clay); this._clay.geometry.dispose(); this._clay.material.dispose(); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._shimmer) { scene.remove(this._shimmer); this._shimmer.geometry.dispose(); this._shimmer.material.dispose(); }
        if (this._splatters) {
            this._splatters.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        this._wheel = this._wheelBase = this._clay = this._glow = this._shimmer = this._splatters = null;
    }
};
