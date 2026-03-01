export default {
    name: 'Working',
    label: 'working',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Workstation (flat box)
        var stationGeo = new THREE.BoxGeometry(0.3, 0.04, 0.15);
        var stationMat = new THREE.MeshBasicMaterial({
            color: 0x3366aa, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._station = new THREE.Mesh(stationGeo, stationMat);
        this._station.position.set(ox, oy - 0.2, 0);
        scene.add(this._station);

        // Station surface glow
        var surfGeo = new THREE.BoxGeometry(0.28, 0.005, 0.13);
        var surfMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._stationSurf = new THREE.Mesh(surfGeo, surfMat);
        this._stationSurf.position.set(ox, oy - 0.175, 0.01);
        scene.add(this._stationSurf);

        // Incoming parts (small shapes from left)
        this._incomingParts = [];
        var partShapes = [
            new THREE.BoxGeometry(0.04, 0.04, 0.04),
            new THREE.SphereGeometry(0.025, 6, 6),
            new THREE.ConeGeometry(0.025, 0.05, 5),
            new THREE.OctahedronGeometry(0.025, 0)
        ];
        for (var i = 0; i < 12; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x4488cc : (i % 3 === 1 ? 0x5599dd : 0x66aaee),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var part = new THREE.Mesh(partShapes[i % partShapes.length], pMat);
            part.visible = false;
            scene.add(part);
            this._incomingParts.push({
                mesh: part,
                active: false,
                spawnTime: 0,
                assembled: false,
                exitTime: 0
            });
        }
        this._nextPart = 0;
        this._lastSpawn = 0;

        // Assembled products (exit right)
        this._products = [];
        var prodGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        for (var j = 0; j < 8; j++) {
            var prMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0x4488cc : 0x66aadd,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var prod = new THREE.Mesh(prodGeo, prMat);
            prod.visible = false;
            scene.add(prod);
            this._products.push({
                mesh: prod, active: false, x: 0, exitSpeed: 0
            });
        }
        this._nextProd = 0;
        this._lastProd = 0;
        this._prodCount = 0;

        // Sweat particles (effort)
        this._sweatParts = [];
        var swGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var k = 0; k < 12; k++) {
            var swMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sw = new THREE.Mesh(swGeo, swMat);
            sw.visible = false;
            scene.add(sw);
            this._sweatParts.push({
                mesh: sw, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._swIdx = 0;

        // Shift counter digits (small boxes stacked as tally)
        this._tallyMarks = [];
        var tallyGeo = new THREE.BoxGeometry(0.015, 0.04, 0.005);
        for (var t = 0; t < 10; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0x4488cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tally = new THREE.Mesh(tallyGeo, tMat);
            tally.position.set(ox + 0.35 + (t % 5) * 0.025, oy + 0.25 - Math.floor(t / 5) * 0.06, 0.02);
            // Every 5th one is diagonal (crossing the previous 4)
            if (t % 5 === 4) {
                tally.rotation.z = 0.5;
                tally.scale.x = 1.5;
            }
            tally.visible = false;
            scene.add(tally);
            this._tallyMarks.push(tally);
        }

        // Rhythm glow (steady pulse)
        var rhythmGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var rhythmMat = new THREE.MeshBasicMaterial({
            color: 0x3366aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._rhythmGlow = new THREE.Mesh(rhythmGeo, rhythmMat);
        this._rhythmGlow.position.set(ox, oy - 0.15, 0);
        scene.add(this._rhythmGlow);

        this._assemblePhase = 0;
    },
    _spawnSweat(x, y) {
        var s = this._sweatParts[this._swIdx % this._sweatParts.length];
        this._swIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + 0.08, 0.02);
        s.vx = (Math.random() - 0.5) * 0.3;
        s.vy = 0.3 + Math.random() * 0.3;
        s.life = 0.3 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Assembly rhythm
        this._assemblePhase = (time * 2.5) % 1.0;

        if (progress < 0.07) {
            // Phase 1: Workstation appears
            var t = progress / 0.07;
            this._station.material.opacity = t * 0.6;
            this._stationSurf.material.opacity = t * 0.3;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.82) {
            // Phase 2: Assembly line operation
            var t2 = (progress - 0.07) / 0.75;
            this._station.material.opacity = 0.6;
            this._stationSurf.material.opacity = 0.3 + Math.sin(time * 3) * 0.05;

            // Spawn incoming parts periodically
            if (time - this._lastSpawn > 0.8 && this._nextPart < this._incomingParts.length) {
                var part = this._incomingParts[this._nextPart];
                part.active = true;
                part.mesh.visible = true;
                part.mesh.position.set(ox - 0.5, oy - 0.15, 0.02);
                part.mesh.material.opacity = 0.7;
                part.spawnTime = time;
                this._nextPart++;
                this._lastSpawn = time;
            }

            // Animate incoming parts
            for (var i = 0; i < this._incomingParts.length; i++) {
                var ip = this._incomingParts[i];
                if (!ip.active) continue;
                var partAge = time - ip.spawnTime;

                if (!ip.assembled) {
                    if (partAge < 0.4) {
                        // Moving toward station
                        var moveT = partAge / 0.4;
                        ip.mesh.position.x = ox - 0.5 + moveT * 0.4;
                        ip.mesh.position.y = oy - 0.15 + Math.sin(moveT * Math.PI) * 0.03;
                        ip.mesh.rotation.y = time * 2;
                    } else if (partAge < 0.7) {
                        // At station, being assembled
                        ip.mesh.position.x = ox - 0.1 + Math.sin(time * 10) * 0.01;
                        ip.mesh.position.y = oy - 0.15;
                        ip.mesh.material.opacity = 0.7 * (1 - (partAge - 0.4) / 0.3);
                    } else {
                        // Assembled, spawn product
                        ip.assembled = true;
                        ip.mesh.visible = false;
                        // Create product
                        if (this._nextProd < this._products.length && time - this._lastProd > 0.7) {
                            var prod = this._products[this._nextProd];
                            prod.active = true;
                            prod.mesh.visible = true;
                            prod.mesh.position.set(ox + 0.1, oy - 0.15, 0.02);
                            prod.mesh.material.opacity = 0.7;
                            prod.x = ox + 0.1;
                            prod.exitSpeed = 0.4;
                            this._nextProd++;
                            this._lastProd = time;
                            this._prodCount++;

                            // Update tally
                            if (this._prodCount <= this._tallyMarks.length) {
                                this._tallyMarks[this._prodCount - 1].visible = true;
                                this._tallyMarks[this._prodCount - 1].material.opacity = 0.6;
                            }
                        }
                    }
                }
            }

            // Animate products exiting right
            for (var pi = 0; pi < this._products.length; pi++) {
                var pr = this._products[pi];
                if (!pr.active) continue;
                pr.x += pr.exitSpeed * delta;
                pr.mesh.position.x = pr.x;
                pr.mesh.rotation.y = time;
                if (pr.x > ox + 0.6) {
                    pr.mesh.material.opacity *= 0.95;
                    if (pr.mesh.material.opacity < 0.01) {
                        pr.mesh.visible = false;
                    }
                }
            }

            // Model working motion (steady reliable rhythm)
            var workMotion = Math.sin(time * 5) * 0.02;
            model.position.set(ox + workMotion, oy + Math.abs(Math.sin(time * 5)) * 0.01, oz);
            model.rotation.z = Math.sin(time * 5) * 0.04;

            // Sweat particles (effort)
            if (Math.random() < 0.03 + t2 * 0.03) {
                this._spawnSweat(model.position.x, model.position.y);
            }

            // Rhythm glow
            var rhythmPulse = Math.sin(time * 5) * 0.5 + 0.5;
            this._rhythmGlow.material.opacity = 0.05 + rhythmPulse * 0.08;
            this._rhythmGlow.scale.setScalar(1 + rhythmPulse * 0.1);
        } else {
            // Phase 3: Settle
            var t3 = (progress - 0.82) / 0.18;
            this._station.material.opacity = 0.6 * (1 - t3);
            this._stationSurf.material.opacity = 0.3 * (1 - t3);
            this._rhythmGlow.material.opacity = 0.1 * (1 - t3);

            for (var ti = 0; ti < this._tallyMarks.length; ti++) {
                if (this._tallyMarks[ti].visible) {
                    this._tallyMarks[ti].material.opacity = 0.6 * (1 - t3);
                }
            }

            for (var fi = 0; fi < this._products.length; fi++) {
                if (this._products[fi].mesh.visible) {
                    this._products[fi].mesh.material.opacity *= 0.95;
                }
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sweat particles
        for (var si = 0; si < this._sweatParts.length; si++) {
            var sp = this._sweatParts[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 1 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.4;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._station) { scene.remove(this._station); this._station.geometry.dispose(); this._station.material.dispose(); }
        if (this._stationSurf) { scene.remove(this._stationSurf); this._stationSurf.geometry.dispose(); this._stationSurf.material.dispose(); }
        if (this._incomingParts) { this._incomingParts.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._products) { this._products.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._sweatParts) { this._sweatParts.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._tallyMarks) { this._tallyMarks.forEach(function(t) { scene.remove(t); t.geometry.dispose(); t.material.dispose(); }); }
        if (this._rhythmGlow) { scene.remove(this._rhythmGlow); this._rhythmGlow.geometry.dispose(); this._rhythmGlow.material.dispose(); }
        this._station = this._stationSurf = this._incomingParts = this._products = this._sweatParts = this._tallyMarks = this._rhythmGlow = null;
    }
};
