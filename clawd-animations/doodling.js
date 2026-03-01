export default {
    name: 'Doodling',
    label: 'doodling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Pencil trail segments (thin cylinders acting as line segments)
        this._trailSegments = [];
        var trailGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4);
        var trailColors = [0x3344ff, 0xff4466, 0x44cc44, 0xff8844, 0xaa44ff,
                           0x44dddd, 0xffcc22, 0xff44aa];
        for (var i = 0; i < 60; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: trailColors[i % trailColors.length],
                transparent: true, opacity: 0
            });
            var seg = new THREE.Mesh(trailGeo, tMat);
            seg.visible = false;
            scene.add(seg);
            this._trailSegments.push({
                mesh: seg, active: false, spawnTime: 0
            });
        }
        this._trailIdx = 0;
        this._lastTrail = 0;

        // Doodle shapes - spirals, stars, smiley faces from positioned segments
        // Spiral: ring of small tori
        this._doodleShapes = [];

        // Spiral (small torus)
        var spiralGeo = new THREE.TorusGeometry(0.04, 0.005, 6, 16);
        var spiralMat = new THREE.MeshBasicMaterial({
            color: 0xff6688, transparent: true, opacity: 0
        });
        var spiral = new THREE.Mesh(spiralGeo, spiralMat);
        spiral.visible = false;
        scene.add(spiral);
        this._doodleShapes.push({
            mesh: spiral, x: ox - 0.3, y: oy + 0.15,
            appearStart: 0.20, appearEnd: 0.30,
            rotSpeed: 2
        });

        // Star (icosahedron as approximation)
        var starGeo = new THREE.IcosahedronGeometry(0.035, 0);
        var starMat = new THREE.MeshBasicMaterial({
            color: 0xffcc22, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        var star = new THREE.Mesh(starGeo, starMat);
        star.visible = false;
        scene.add(star);
        this._doodleShapes.push({
            mesh: star, x: ox + 0.15, y: oy + 0.18,
            appearStart: 0.32, appearEnd: 0.42,
            rotSpeed: 1.5
        });

        // Smiley face (sphere)
        var faceGeo = new THREE.SphereGeometry(0.04, 10, 10);
        var faceMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0
        });
        var face = new THREE.Mesh(faceGeo, faceMat);
        face.visible = false;
        scene.add(face);
        this._doodleShapes.push({
            mesh: face, x: ox - 0.15, y: oy - 0.2,
            appearStart: 0.44, appearEnd: 0.54,
            rotSpeed: 0.5
        });

        // Heart (two spheres close together)
        var heartGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var heartMat1 = new THREE.MeshBasicMaterial({
            color: 0xff4466, transparent: true, opacity: 0
        });
        var heart1 = new THREE.Mesh(heartGeo, heartMat1);
        heart1.visible = false;
        scene.add(heart1);
        this._doodleShapes.push({
            mesh: heart1, x: ox + 0.25, y: oy - 0.1,
            appearStart: 0.50, appearEnd: 0.60,
            rotSpeed: 1
        });

        // Another spiral
        var spiral2Geo = new THREE.TorusGeometry(0.03, 0.004, 6, 12);
        var spiral2Mat = new THREE.MeshBasicMaterial({
            color: 0x44ccff, transparent: true, opacity: 0
        });
        var spiral2 = new THREE.Mesh(spiral2Geo, spiral2Mat);
        spiral2.visible = false;
        scene.add(spiral2);
        this._doodleShapes.push({
            mesh: spiral2, x: ox + 0.05, y: oy - 0.22,
            appearStart: 0.56, appearEnd: 0.66,
            rotSpeed: -2
        });

        // Ink splatter particles
        this._splatters = [];
        var splatGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var si = 0; si < 25; si++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: trailColors[si % trailColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var splat = new THREE.Mesh(splatGeo, spMat);
            splat.visible = false;
            scene.add(splat);
            this._splatters.push({
                mesh: splat, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                rotSpeed: 0
            });
        }
        this._splatIdx = 0;

        // Fun energy glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy, -0.05);
        scene.add(this._glow);

        this._modelAngle = 0;
    },
    _emitSplatter(x, y) {
        var s = this._splatters[this._splatIdx % this._splatters.length];
        this._splatIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.02);
        var a = Math.random() * Math.PI * 2;
        var spd = 0.5 + Math.random() * 1.0;
        s.vx = Math.cos(a) * spd;
        s.vy = Math.sin(a) * spd;
        s.vz = (Math.random() - 0.5) * 0.2;
        s.life = 0.3 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.rotSpeed = (Math.random() - 0.5) * 8;
        s.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Model moves in squiggly casual patterns
        this._modelAngle += delta * 2.5;
        var squigX = Math.sin(this._modelAngle) * 0.05 + Math.sin(this._modelAngle * 2.3) * 0.03;
        var squigY = Math.cos(this._modelAngle * 1.7) * 0.04 + Math.sin(this._modelAngle * 0.8) * 0.02;

        if (progress < 0.08) {
            // Phase 1: Model starts moving
            var t = progress / 0.08;
            model.position.set(ox + squigX * t, oy + squigY * t, oz);
        } else if (progress < 0.70) {
            // Phase 2: Drawing trails and doodle shapes appear
            var t2 = (progress - 0.08) / 0.62;
            model.position.set(ox + squigX, oy + squigY, oz);
            model.rotation.z = Math.sin(this._modelAngle * 1.5) * 0.04;

            // Leave trail segments behind model
            if (time - this._lastTrail > 0.06) {
                var seg = this._trailSegments[this._trailIdx % this._trailSegments.length];
                this._trailIdx++;
                seg.mesh.visible = true;
                seg.mesh.position.set(
                    model.position.x + (Math.random() - 0.5) * 0.02,
                    model.position.y + (Math.random() - 0.5) * 0.02,
                    0.01
                );
                seg.mesh.rotation.z = this._modelAngle + Math.random() * 0.5;
                seg.mesh.material.opacity = 0.5;
                seg.spawnTime = time;
                seg.active = true;
                this._lastTrail = time;
            }

            // Doodle shapes appear at their scheduled times
            for (var di = 0; di < this._doodleShapes.length; di++) {
                var ds = this._doodleShapes[di];
                if (progress < ds.appearStart) continue;
                if (progress < ds.appearEnd) {
                    var dT = (progress - ds.appearStart) / (ds.appearEnd - ds.appearStart);
                    ds.mesh.visible = true;
                    ds.mesh.position.set(ds.x, ds.y, 0.02);
                    ds.mesh.material.opacity = dT * 0.7;
                    ds.mesh.scale.setScalar(dT);
                    ds.mesh.rotation.z += delta * ds.rotSpeed;
                    // Splatter when shape appears
                    if (dT > 0.3 && dT < 0.5 && Math.random() < 0.2) {
                        this._emitSplatter(ds.x, ds.y);
                    }
                } else {
                    ds.mesh.material.opacity = 0.7 + Math.sin(time * 2 + di) * 0.1;
                    ds.mesh.rotation.z += delta * ds.rotSpeed * 0.3;
                }
            }

            // Random ink splatters
            if (Math.random() < 0.03 + t2 * 0.04) {
                this._emitSplatter(
                    model.position.x + (Math.random() - 0.5) * 0.1,
                    model.position.y + (Math.random() - 0.5) * 0.1
                );
            }
        } else if (progress < 0.85) {
            // Phase 3: Maximum doodle energy
            var t3 = (progress - 0.70) / 0.15;
            model.position.set(ox + squigX * 1.3, oy + squigY * 1.3, oz);
            model.rotation.z = Math.sin(this._modelAngle * 2) * 0.06;

            // All shapes visible and pulsing
            for (var di2 = 0; di2 < this._doodleShapes.length; di2++) {
                var ds2 = this._doodleShapes[di2];
                ds2.mesh.material.opacity = 0.7 + Math.sin(time * 3 + di2 * 1.2) * 0.2;
                ds2.mesh.rotation.z += delta * ds2.rotSpeed * 0.5;
                ds2.mesh.scale.setScalar(1.0 + Math.sin(time * 2 + di2) * 0.15);
            }

            // Lots of splatters
            if (Math.random() < 0.12) {
                this._emitSplatter(
                    ox + (Math.random() - 0.5) * 0.5,
                    oy + (Math.random() - 0.5) * 0.4
                );
            }

            this._glow.material.opacity = t3 * 0.1;
            this._glow.scale.setScalar(1 + t3 * 0.3);
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.85) / 0.15;
            var fadeOut = 1 - t4;
            for (var ti = 0; ti < this._trailSegments.length; ti++) {
                if (this._trailSegments[ti].active) {
                    this._trailSegments[ti].mesh.material.opacity *= fadeOut;
                }
            }
            for (var di3 = 0; di3 < this._doodleShapes.length; di3++) {
                this._doodleShapes[di3].mesh.material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + squigX * fadeOut, oy + squigY * fadeOut, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Fade old trail segments
        for (var fi = 0; fi < this._trailSegments.length; fi++) {
            var seg2 = this._trailSegments[fi];
            if (!seg2.active) continue;
            var age = time - seg2.spawnTime;
            if (age > 3.0) {
                seg2.mesh.material.opacity *= 0.95;
                if (seg2.mesh.material.opacity < 0.02) {
                    seg2.mesh.visible = false;
                    seg2.active = false;
                }
            }
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
            sp.mesh.rotation.z += sp.rotSpeed * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.6;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._trailSegments) {
            this._trailSegments.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._doodleShapes) {
            this._doodleShapes.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._splatters) {
            this._splatters.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._trailSegments = this._doodleShapes = this._splatters = this._glow = null;
    }
};
