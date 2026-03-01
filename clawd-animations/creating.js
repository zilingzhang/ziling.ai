export default {
    name: 'Creating',
    label: 'creating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Central spark point
        var sparkGeo = new THREE.SphereGeometry(0.015, 8, 8);
        var sparkMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._spark = new THREE.Mesh(sparkGeo, sparkMat);
        this._spark.position.set(ox, oy, 0.05);
        scene.add(this._spark);

        // Big bang particles (40 particles radiating outward)
        this._particles = [];
        var partGeo = new THREE.SphereGeometry(0.012, 6, 6);
        var bangColors = [0xffffff, 0xffdd44, 0xff8844, 0xff4466, 0x44aaff,
                          0x44ffaa, 0xaa44ff, 0xffaa44, 0xff66cc, 0x66ccff];
        for (var i = 0; i < 40; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: bangColors[i % bangColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var part = new THREE.Mesh(partGeo, pMat);
            part.visible = false;
            scene.add(part);
            var angle = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
            var speed = 0.8 + Math.random() * 1.5;
            this._particles.push({
                mesh: part,
                angle: angle,
                speed: speed,
                dist: 0,
                maxDist: 0.2 + Math.random() * 0.25,
                life: 0, maxLife: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                baseX: ox,
                baseY: oy,
                settled: false,
                targetX: 0,
                targetY: 0,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Coalesced shape pieces (octahedrons that form a structure)
        this._shapePieces = [];
        var shapeColors = [0xff6644, 0xff8866, 0xffaa88, 0xffcc44, 0xffee88,
                           0x44aaff, 0x66ccff, 0x88eeff, 0x44ffaa, 0x88ffcc];
        var shapePositions = [
            { x: 0, y: 0.05 }, { x: -0.06, y: 0 }, { x: 0.06, y: 0 },
            { x: -0.03, y: -0.05 }, { x: 0.03, y: -0.05 },
            { x: 0, y: -0.1 }, { x: -0.08, y: 0.03 }, { x: 0.08, y: 0.03 },
            { x: -0.04, y: 0.08 }, { x: 0.04, y: 0.08 }
        ];
        for (var si = 0; si < 10; si++) {
            var sGeo = new THREE.OctahedronGeometry(0.02 + Math.random() * 0.015, 0);
            var sMat = new THREE.MeshBasicMaterial({
                color: shapeColors[si],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var shape = new THREE.Mesh(sGeo, sMat);
            shape.visible = false;
            scene.add(shape);
            this._shapePieces.push({
                mesh: shape,
                targetX: ox + shapePositions[si].x,
                targetY: oy + shapePositions[si].y,
                rotSpeed: (Math.random() - 0.5) * 3
            });
        }

        // Genesis glow
        var glowGeo = new THREE.SphereGeometry(0.35, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy, -0.05);
        scene.add(this._glow);

        // Life energy pulse ring
        var pulseGeo = new THREE.TorusGeometry(0.15, 0.008, 8, 32);
        var pulseMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
        this._pulseRing.position.set(ox, oy, 0.02);
        scene.add(this._pulseRing);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Empty void, model dimmed
            model.position.set(ox, oy, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.9 + progress / 0.08 * 0.1);
        } else if (progress < 0.18) {
            // Phase 2: Spark of creation - single bright point
            var t = (progress - 0.08) / 0.10;
            this._spark.material.opacity = t * 1.0;
            this._spark.scale.setScalar(0.5 + t * 2.0);
            // Spark pulses rapidly
            var sparkPulse = Math.sin(time * 15) * 0.5 + 0.5;
            this._spark.material.opacity = t * (0.7 + sparkPulse * 0.3);
            this._glow.material.opacity = t * 0.05;
            this._glow.scale.setScalar(0.3 + t * 0.3);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.38) {
            // Phase 3: Big bang - particles radiate outward
            var t2 = (progress - 0.18) / 0.20;
            // Spark fades as it explodes
            this._spark.material.opacity = (1 - t2) * 0.8;
            this._spark.scale.setScalar(2.5 + t2 * 3);

            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                var pDelay = (i / this._particles.length) * 0.3;
                var pT = Math.max(0, Math.min(1, (t2 - pDelay) / 0.7));
                p.mesh.visible = pT > 0;
                p.dist = pT * p.maxDist;
                p.mesh.position.set(
                    ox + Math.cos(p.angle) * p.dist,
                    oy + Math.sin(p.angle) * p.dist,
                    0.03
                );
                p.mesh.material.opacity = pT * 0.8;
                p.mesh.scale.setScalar(0.5 + pT * 1.0);
            }

            this._glow.material.opacity = t2 * 0.15;
            this._glow.scale.setScalar(0.6 + t2 * 0.8);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.58) {
            // Phase 4: Particles coalesce into shapes
            var t3 = (progress - 0.38) / 0.20;
            this._spark.visible = false;

            // Particles slow and drift toward shape positions
            for (var i2 = 0; i2 < this._particles.length; i2++) {
                var p2 = this._particles[i2];
                var targetShape = this._shapePieces[i2 % this._shapePieces.length];
                var curX = ox + Math.cos(p2.angle) * p2.maxDist;
                var curY = oy + Math.sin(p2.angle) * p2.maxDist;
                var tX = targetShape.targetX;
                var tY = targetShape.targetY;
                p2.mesh.position.set(
                    curX + (tX - curX) * t3,
                    curY + (tY - curY) * t3,
                    0.03
                );
                p2.mesh.material.opacity = (1 - t3 * 0.7) * 0.8;
                p2.mesh.scale.setScalar(1.5 * (1 - t3 * 0.5));
            }

            // Shape pieces start appearing
            for (var si = 0; si < this._shapePieces.length; si++) {
                var sp = this._shapePieces[si];
                var spT = Math.max(0, Math.min(1, (t3 - si * 0.05) / 0.5));
                sp.mesh.visible = spT > 0;
                sp.mesh.position.set(sp.targetX, sp.targetY, 0.04);
                sp.mesh.material.opacity = spT * 0.6;
                sp.mesh.scale.setScalar(spT);
                sp.mesh.rotation.y += delta * sp.rotSpeed;
            }

            this._glow.material.opacity = 0.15 - t3 * 0.05;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.75) {
            // Phase 5: Recognizable structure forms
            var t4 = (progress - 0.58) / 0.17;

            // Hide remaining loose particles
            for (var i3 = 0; i3 < this._particles.length; i3++) {
                this._particles[i3].mesh.material.opacity *= (1 - t4 * 0.08);
                if (this._particles[i3].mesh.material.opacity < 0.02) {
                    this._particles[i3].mesh.visible = false;
                }
            }

            // Shape pieces solidify and pulse together
            for (var si2 = 0; si2 < this._shapePieces.length; si2++) {
                var sp2 = this._shapePieces[si2];
                sp2.mesh.material.opacity = 0.6 + Math.sin(time * 2 + si2 * 0.5) * 0.15;
                sp2.mesh.rotation.y += delta * sp2.rotSpeed * 0.5;
                // Gentle breathing scale
                sp2.mesh.scale.setScalar(1.0 + Math.sin(time * 1.5 + si2) * 0.1);
            }

            this._glow.material.opacity = 0.1 + t4 * 0.05;
            model.position.set(ox, oy + Math.sin(time * 1.2) * 0.005, oz);
        } else if (progress < 0.90) {
            // Phase 6: Final creation pulses with life energy
            var t5 = (progress - 0.75) / 0.15;
            var lifePulse = Math.sin(t5 * Math.PI * 4);

            for (var si3 = 0; si3 < this._shapePieces.length; si3++) {
                var sp3 = this._shapePieces[si3];
                sp3.mesh.material.opacity = 0.7 + lifePulse * 0.15;
                sp3.mesh.rotation.y += delta * sp3.rotSpeed * 0.3;
                // Color shift toward warm white
                var warmth = 0.5 + t5 * 0.5;
                sp3.mesh.material.color.setRGB(
                    warmth + 0.3,
                    warmth + 0.1,
                    warmth - 0.1
                );
            }

            // Pulse ring expands
            this._pulseRing.material.opacity = (0.3 + lifePulse * 0.2) * t5;
            this._pulseRing.scale.setScalar(1 + Math.sin(time * 3) * 0.3);

            this._glow.material.opacity = 0.15 + lifePulse * 0.08;
            this._glow.scale.setScalar(1.4 + lifePulse * 0.2);

            model.position.set(ox, oy, oz);
        } else {
            // Phase 7: Fade out
            var t6 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t6;
            for (var si4 = 0; si4 < this._shapePieces.length; si4++) {
                this._shapePieces[si4].mesh.material.opacity *= fadeOut;
            }
            this._pulseRing.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._spark) { scene.remove(this._spark); this._spark.geometry.dispose(); this._spark.material.dispose(); }
        if (this._particles) {
            this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._shapePieces) {
            this._shapePieces.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._pulseRing) { scene.remove(this._pulseRing); this._pulseRing.geometry.dispose(); this._pulseRing.material.dispose(); }
        this._spark = this._particles = this._shapePieces = this._glow = this._pulseRing = null;
    }
};
