export default {
    name: 'Osmosing',
    label: 'osmosing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Semi-permeable membrane (translucent flat disc)
        var memGeo = new THREE.PlaneGeometry(0.04, 0.6);
        var memMat = new THREE.MeshBasicMaterial({
            color: 0x66aacc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._membrane = new THREE.Mesh(memGeo, memMat);
        this._membrane.position.set(ox, oy, 0);
        scene.add(this._membrane);

        // Small particles (can pass through)
        this._smallParts = [];
        var smallGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var i = 0; i < 30; i++) {
            var side = i < 20 ? -1 : 1; // More on left initially (high concentration)
            var spMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x44ddbb : (i % 3 === 1 ? 0x66eedd : 0x33ccaa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sp = new THREE.Mesh(smallGeo, spMat);
            var sx = ox + side * (0.1 + Math.random() * 0.4);
            var sy = oy + (Math.random() - 0.5) * 0.45;
            sp.position.set(sx, sy, 0);
            scene.add(sp);
            this._smallParts.push({
                mesh: sp,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                side: side,
                canPass: true,
                passing: false,
                passTimer: 0
            });
        }

        // Large particles (blocked by membrane)
        this._largeParts = [];
        var largeGeo = new THREE.SphereGeometry(0.04, 8, 8);
        for (var j = 0; j < 8; j++) {
            var lSide = j < 5 ? -1 : 1;
            var lpMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0x4488ff : 0x6699ff, transparent: true, opacity: 0,
                depthWrite: false
            });
            var lp = new THREE.Mesh(largeGeo, lpMat);
            var lx = ox + lSide * (0.15 + Math.random() * 0.35);
            var ly = oy + (Math.random() - 0.5) * 0.4;
            lp.position.set(lx, ly, 0);
            scene.add(lp);
            this._largeParts.push({
                mesh: lp,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                side: lSide,
                bounceTimer: 0
            });
        }

        // Bounce sparks (when large particles hit membrane)
        this._bounceSparks = [];
        var bsGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var k = 0; k < 20; k++) {
            var bsMat = new THREE.MeshBasicMaterial({
                color: 0x88bbff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bs = new THREE.Mesh(bsGeo, bsMat);
            bs.visible = false;
            scene.add(bs);
            this._bounceSparks.push({ mesh: bs, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._bsIdx = 0;

        // Equilibrium glow
        var eqGeo = new THREE.PlaneGeometry(1.2, 0.7);
        var eqMat = new THREE.MeshBasicMaterial({
            color: 0x44bbaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._eqGlow = new THREE.Mesh(eqGeo, eqMat);
        this._eqGlow.position.set(ox, oy, -0.02);
        scene.add(this._eqGlow);
    },
    _emitBounce(x, y, dirX) {
        for (var i = 0; i < 3; i++) {
            var b = this._bounceSparks[this._bsIdx % this._bounceSparks.length];
            this._bsIdx++;
            b.mesh.visible = true;
            b.mesh.position.set(x, y, 0);
            b.vx = dirX * (1.0 + Math.random() * 1.5);
            b.vy = (Math.random() - 0.5) * 2.0;
            b.life = 0.2 + Math.random() * 0.15;
            b.maxLife = b.life;
            b.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Membrane appears
            var t = progress / 0.08;
            this._membrane.material.opacity = t * 0.4;

            for (var si = 0; si < this._smallParts.length; si++) {
                this._smallParts[si].mesh.material.opacity = t * 0.7;
            }
            for (var li = 0; li < this._largeParts.length; li++) {
                this._largeParts[li].mesh.material.opacity = t * 0.6;
            }
            model.position.set(ox - 0.5, oy + 0.2, oz);
        } else if (progress < 0.70) {
            // Phase 2: Osmosis in action
            var t2 = (progress - 0.08) / 0.62;
            this._membrane.material.opacity = 0.4 + Math.sin(time * 3) * 0.1;
            // Membrane shimmer
            this._membrane.scale.y = 1 + Math.sin(time * 6) * 0.02;

            // Move small particles - natural drift toward equilibrium
            for (var sj = 0; sj < this._smallParts.length; sj++) {
                var sp = this._smallParts[sj];

                // Random Brownian motion
                sp.vx += (Math.random() - 0.5) * delta * 3;
                sp.vy += (Math.random() - 0.5) * delta * 3;

                // Concentration gradient force (move from high to low)
                var gradientForce = t2 * 0.5;
                if (sp.mesh.position.x < ox) {
                    sp.vx += gradientForce * delta;
                }

                // Can pass through membrane
                if (Math.abs(sp.mesh.position.x - ox) < 0.03) {
                    // Near membrane, allow passage
                    sp.mesh.material.opacity = 0.5;
                } else {
                    sp.mesh.material.opacity = 0.7;
                }

                // Damping
                sp.vx *= 0.97;
                sp.vy *= 0.97;

                sp.mesh.position.x += sp.vx * delta;
                sp.mesh.position.y += sp.vy * delta;

                // Boundary
                if (sp.mesh.position.y > oy + 0.25) sp.vy = -Math.abs(sp.vy) * 0.5;
                if (sp.mesh.position.y < oy - 0.25) sp.vy = Math.abs(sp.vy) * 0.5;
                if (sp.mesh.position.x > ox + 0.55) sp.vx = -Math.abs(sp.vx) * 0.5;
                if (sp.mesh.position.x < ox - 0.55) sp.vx = Math.abs(sp.vx) * 0.5;
            }

            // Move large particles - blocked by membrane
            for (var lj = 0; lj < this._largeParts.length; lj++) {
                var lp = this._largeParts[lj];

                lp.vx += (Math.random() - 0.5) * delta * 2;
                lp.vy += (Math.random() - 0.5) * delta * 2;
                lp.vx *= 0.96;
                lp.vy *= 0.96;

                lp.mesh.position.x += lp.vx * delta;
                lp.mesh.position.y += lp.vy * delta;

                // Bounce off membrane
                if (lp.side < 0 && lp.mesh.position.x > ox - 0.06) {
                    lp.mesh.position.x = ox - 0.06;
                    lp.vx = -Math.abs(lp.vx) * 0.8;
                    lp.bounceTimer -= delta;
                    if (lp.bounceTimer <= 0) {
                        this._emitBounce(ox - 0.04, lp.mesh.position.y, -1);
                        lp.bounceTimer = 0.5;
                    }
                }
                if (lp.side > 0 && lp.mesh.position.x < ox + 0.06) {
                    lp.mesh.position.x = ox + 0.06;
                    lp.vx = Math.abs(lp.vx) * 0.8;
                    lp.bounceTimer -= delta;
                    if (lp.bounceTimer <= 0) {
                        this._emitBounce(ox + 0.04, lp.mesh.position.y, 1);
                        lp.bounceTimer = 0.5;
                    }
                }

                // Other boundaries
                if (lp.mesh.position.y > oy + 0.22) lp.vy = -Math.abs(lp.vy) * 0.5;
                if (lp.mesh.position.y < oy - 0.22) lp.vy = Math.abs(lp.vy) * 0.5;
                if (lp.mesh.position.x > ox + 0.55) lp.vx = -Math.abs(lp.vx) * 0.5;
                if (lp.mesh.position.x < ox - 0.55) lp.vx = Math.abs(lp.vx) * 0.5;

                lp.mesh.material.opacity = 0.6;
            }

            model.position.set(ox - 0.5 + Math.sin(time * 0.8) * 0.05, oy + 0.2 + Math.sin(time * 1.2) * 0.02, oz);
        } else if (progress < 0.88) {
            // Phase 3: Equilibrium reached
            var t3 = (progress - 0.70) / 0.18;

            this._eqGlow.material.opacity = t3 * 0.15;
            this._membrane.material.opacity = 0.4 + Math.sin(time * 2) * 0.05;

            // Particles settle into even distribution
            for (var sk = 0; sk < this._smallParts.length; sk++) {
                var sp2 = this._smallParts[sk];
                sp2.vx *= 0.95;
                sp2.vy *= 0.95;
                sp2.vx += (Math.random() - 0.5) * delta * 1.5;
                sp2.vy += (Math.random() - 0.5) * delta * 1.5;
                sp2.mesh.position.x += sp2.vx * delta;
                sp2.mesh.position.y += sp2.vy * delta;
                sp2.mesh.material.opacity = 0.7;
            }

            for (var lk = 0; lk < this._largeParts.length; lk++) {
                var lp2 = this._largeParts[lk];
                lp2.vx *= 0.93;
                lp2.vy *= 0.93;
                lp2.mesh.position.x += lp2.vx * delta;
                lp2.mesh.position.y += lp2.vy * delta;
            }

            model.position.set(ox - 0.5, oy + 0.2, oz);
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.88) / 0.12;

            this._membrane.material.opacity = 0.4 * (1 - t4);
            this._eqGlow.material.opacity = 0.15 * (1 - t4);
            for (var sm = 0; sm < this._smallParts.length; sm++) {
                this._smallParts[sm].mesh.material.opacity = 0.7 * (1 - t4);
            }
            for (var ll = 0; ll < this._largeParts.length; ll++) {
                this._largeParts[ll].mesh.material.opacity = 0.6 * (1 - t4);
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update bounce sparks
        for (var bi = 0; bi < this._bounceSparks.length; bi++) {
            var bs = this._bounceSparks[bi];
            if (bs.life <= 0) continue;
            bs.life -= delta;
            if (bs.life <= 0) { bs.mesh.visible = false; continue; }
            bs.mesh.position.x += bs.vx * delta;
            bs.mesh.position.y += bs.vy * delta;
            bs.mesh.material.opacity = 0.8 * (bs.life / bs.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._membrane) { scene.remove(this._membrane); this._membrane.geometry.dispose(); this._membrane.material.dispose(); }
        if (this._smallParts) {
            this._smallParts.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._largeParts) {
            this._largeParts.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); });
        }
        if (this._bounceSparks) {
            this._bounceSparks.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._eqGlow) { scene.remove(this._eqGlow); this._eqGlow.geometry.dispose(); this._eqGlow.material.dispose(); }
        this._membrane = this._smallParts = this._largeParts = this._bounceSparks = this._eqGlow = null;
    }
};
