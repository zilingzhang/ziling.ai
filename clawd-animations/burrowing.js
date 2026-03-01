export default {
    name: 'Burrowing',
    label: 'burrowing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Ground surface disc
        var groundGeo = new THREE.CircleGeometry(0.8, 32);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0x5a3e28, transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false
        });
        this._ground = new THREE.Mesh(groundGeo, groundMat);
        this._ground.rotation.x = -Math.PI / 2;
        this._ground.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._ground);

        // Dark hole circle (expanding)
        var holeGeo = new THREE.CircleGeometry(0.05, 24);
        var holeMat = new THREE.MeshBasicMaterial({
            color: 0x1a0e05, transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false
        });
        this._hole = new THREE.Mesh(holeGeo, holeMat);
        this._hole.rotation.x = -Math.PI / 2;
        this._hole.position.set(this._origPos.x, this._origPos.y - 0.19, 0);
        scene.add(this._hole);

        // Underground glow
        var glowGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._underGlow = new THREE.Mesh(glowGeo, glowMat);
        this._underGlow.visible = false;
        scene.add(this._underGlow);

        // Dirt chunk particles
        this._dirt = [];
        var dirtGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
        for (var i = 0; i < 30; i++) {
            var dirtColors = [0x6b4226, 0x8b5e34, 0x4a2f17, 0x9e7b5b, 0x3d2410];
            var dMat = new THREE.MeshBasicMaterial({
                color: dirtColors[i % dirtColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dirt = new THREE.Mesh(dirtGeo, dMat);
            dirt.visible = false;
            scene.add(dirt);
            this._dirt.push({ mesh: dirt, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rv: 0 });
        }
        this._dirtIdx = 0;

        // Tunnel trail markers
        this._tunnelTrail = [];
        var trailGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var j = 0; j < 10; j++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xff8833, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._tunnelTrail.push({ mesh: trail, placed: false });
        }
        this._trailIdx = 0;
        this._lastDirt = 0;

        // Emergence hole (second location)
        var hole2Geo = new THREE.CircleGeometry(0.05, 24);
        var hole2Mat = new THREE.MeshBasicMaterial({
            color: 0x1a0e05, transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false
        });
        this._hole2 = new THREE.Mesh(hole2Geo, hole2Mat);
        this._hole2.rotation.x = -Math.PI / 2;
        this._hole2.position.set(this._origPos.x + 0.5, this._origPos.y - 0.19, 0);
        this._hole2.visible = false;
        scene.add(this._hole2);
    },
    _emitDirt(x, y, intensity) {
        var count = Math.floor(3 + intensity * 4);
        for (var i = 0; i < count; i++) {
            var d = this._dirt[this._dirtIdx % this._dirt.length];
            this._dirtIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, (Math.random() - 0.5) * 0.1);
            var angle = Math.random() * Math.PI * 2;
            var spd = (0.5 + Math.random() * 1.5) * intensity;
            d.vx = Math.cos(angle) * spd * 0.5;
            d.vy = 1.0 + Math.random() * 2.0 * intensity;
            d.vz = Math.sin(angle) * spd * 0.3;
            d.rv = (Math.random() - 0.5) * 8;
            d.life = 0.6 + Math.random() * 0.6;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.9;
            d.mesh.scale.setScalar(0.5 + Math.random() * 1.5);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Ground appears, model starts digging motion
            var t = progress / 0.08;
            this._ground.material.opacity = t * 0.4;
            model.position.set(orig.x, orig.y, orig.z);
            // Wiggle as if preparing to dig
            model.rotation.z = Math.sin(time * 12) * 0.05 * t;
        } else if (progress < 0.20) {
            // Digging begins: hole expands, dirt flies up
            var t2 = (progress - 0.08) / 0.12;
            this._ground.material.opacity = 0.4;
            this._hole.material.opacity = t2 * 0.9;
            this._hole.scale.setScalar(1 + t2 * 4);

            // Model bobs up and down (digging motion)
            var digBob = Math.abs(Math.sin(time * 10)) * 0.06;
            model.position.set(orig.x, orig.y - t2 * 0.05 + digBob, orig.z);
            model.rotation.z = Math.sin(time * 10) * 0.08;
            model.scale.set(gs * (1 + digBob), gs * (1 - digBob * 0.5), gs);

            // Dirt particles
            if (time - this._lastDirt > 0.08) {
                this._emitDirt(orig.x, orig.y - 0.1, 0.5 + t2 * 0.5);
                this._lastDirt = time;
            }
        } else if (progress < 0.45) {
            // Sinking below surface
            var t3 = (progress - 0.20) / 0.25;
            this._hole.material.opacity = 0.9;
            this._hole.scale.setScalar(5 + t3 * 2);

            // Model sinks progressively
            var sinkY = orig.y - t3 * 0.4;
            model.position.set(orig.x, sinkY, orig.z);
            model.rotation.z = Math.sin(time * 8) * 0.06 * (1 - t3);

            // Scale shrinks as it goes below
            var shrink = 1 - t3 * 0.5;
            model.scale.set(gs * shrink, gs * shrink, gs * shrink);

            // Less dirt as model goes deeper
            if (time - this._lastDirt > 0.12 && t3 < 0.7) {
                this._emitDirt(orig.x, orig.y - 0.15, 0.3 * (1 - t3));
                this._lastDirt = time;
            }

            // Underground glow starts
            if (t3 > 0.5) {
                this._underGlow.visible = true;
                this._underGlow.position.set(orig.x, orig.y - 0.3, 0);
                this._underGlow.material.opacity = (t3 - 0.5) * 0.4;
            }
        } else if (progress < 0.65) {
            // Underground traversal (model hidden, glow moves)
            var t4 = (progress - 0.45) / 0.20;
            model.visible = false;

            // Glow travels underground
            var travelX = orig.x + t4 * 0.5;
            this._underGlow.visible = true;
            this._underGlow.position.set(travelX, orig.y - 0.25, 0);
            this._underGlow.material.opacity = 0.3 + Math.sin(time * 4) * 0.1;

            // Ground bumps above tunnel
            this._ground.position.y = orig.y - 0.2 + Math.sin(time * 6) * 0.01;

            // Tunnel trail
            if (this._trailIdx < this._tunnelTrail.length && t4 > this._trailIdx * 0.1) {
                var tr = this._tunnelTrail[this._trailIdx];
                tr.mesh.visible = true;
                tr.mesh.position.set(travelX, orig.y - 0.25, 0);
                tr.mesh.material.opacity = 0.3;
                tr.placed = true;
                this._trailIdx++;
            }

            // Emergence hole appears
            if (t4 > 0.6) {
                this._hole2.visible = true;
                var h2t = (t4 - 0.6) / 0.4;
                this._hole2.material.opacity = h2t * 0.9;
                this._hole2.scale.setScalar(1 + h2t * 3);
            }
        } else if (progress < 0.82) {
            // Emergence: model rises from new position with dirt shower
            var t5 = (progress - 0.65) / 0.17;
            model.visible = true;

            var emergeX = orig.x + 0.5;
            var emergeY = orig.y - 0.4 + t5 * 0.4;
            model.position.set(emergeX, emergeY, orig.z);

            // Grow back to full size
            var growScale = 0.5 + t5 * 0.5;
            model.scale.set(gs * growScale, gs * growScale, gs * growScale);
            model.rotation.z = Math.sin(time * 6) * 0.04 * (1 - t5);

            this._hole2.scale.setScalar(4 + t5 * 2);

            // Big dirt shower on emergence
            if (time - this._lastDirt > 0.06 && t5 < 0.6) {
                this._emitDirt(emergeX, emergeY, 1.0);
                this._lastDirt = time;
            }

            // Underground glow fades
            this._underGlow.material.opacity = 0.3 * (1 - t5);

            // Fade tunnel trail
            for (var ti = 0; ti < this._tunnelTrail.length; ti++) {
                if (this._tunnelTrail[ti].placed) {
                    this._tunnelTrail[ti].mesh.material.opacity = 0.3 * (1 - t5);
                }
            }
        } else {
            // Settle back, everything fades
            var t6 = (progress - 0.82) / 0.18;
            var settleX = orig.x + 0.5 * (1 - t6);
            model.position.set(settleX, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._ground.material.opacity = 0.4 * (1 - t6);
            this._hole.material.opacity = 0.9 * (1 - t6);
            this._hole2.material.opacity = 0.9 * (1 - t6);
            this._underGlow.material.opacity = 0;
            this._underGlow.visible = false;

            for (var ti2 = 0; ti2 < this._tunnelTrail.length; ti2++) {
                if (this._tunnelTrail[ti2].placed) {
                    this._tunnelTrail[ti2].mesh.visible = t6 < 0.5;
                }
            }
        }

        // Update dirt particles
        for (var di = 0; di < this._dirt.length; di++) {
            var dp = this._dirt[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            dp.vy -= 3.5 * delta;
            dp.mesh.rotation.x += dp.rv * delta;
            dp.mesh.rotation.z += dp.rv * 0.7 * delta;
            dp.mesh.material.opacity = 0.9 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._ground) {
            scene.remove(this._ground);
            this._ground.geometry.dispose();
            this._ground.material.dispose();
        }
        if (this._hole) {
            scene.remove(this._hole);
            this._hole.geometry.dispose();
            this._hole.material.dispose();
        }
        if (this._hole2) {
            scene.remove(this._hole2);
            this._hole2.geometry.dispose();
            this._hole2.material.dispose();
        }
        if (this._underGlow) {
            scene.remove(this._underGlow);
            this._underGlow.geometry.dispose();
            this._underGlow.material.dispose();
        }
        if (this._dirt) {
            this._dirt.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        }
        if (this._tunnelTrail) {
            this._tunnelTrail.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        this._ground = this._hole = this._hole2 = this._underGlow = this._dirt = this._tunnelTrail = null;
    }
};
