export default {
    name: 'Hullaballooing',
    label: 'hullaballooing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Sound wave rings (torus rings blasting outward)
        this._waves = [];
        var waveColors = [0xff4488, 0x4488ff, 0x44ff88, 0xffff44, 0xff8844, 0xaa44ff];
        for (var w = 0; w < 12; w++) {
            var wGeo = new THREE.TorusGeometry(0.05, 0.008, 6, 20);
            var wMat = new THREE.MeshBasicMaterial({
                color: waveColors[w % waveColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wMesh = new THREE.Mesh(wGeo, wMat);
            wMesh.visible = false;
            scene.add(wMesh);
            this._waves.push({
                mesh: wMesh, life: 0, maxLife: 0,
                startX: 0, startY: 0, dirX: 0, dirY: 0, speed: 0
            });
        }
        this._waveIdx = 0;
        this._lastWave = 0;

        // Confetti particles
        this._confetti = [];
        var confGeo = new THREE.PlaneGeometry(0.015, 0.015);
        var confColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844,
                          0xaa44ff, 0x44ffff, 0xff44ff, 0x88ff44, 0xffaa88,
                          0xff6644, 0x44aaff, 0xaaff44, 0xff44aa, 0x6644ff,
                          0x44ffaa, 0xffcc44, 0xcc44ff, 0x44ff44, 0xff4444,
                          0x88aaff, 0xffdd88, 0xaa88ff, 0x88ffaa, 0xddff88];
        for (var c = 0; c < 25; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: confColors[c], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var cMesh = new THREE.Mesh(confGeo, cMat);
            cMesh.visible = false;
            scene.add(cMesh);
            this._confetti.push({
                mesh: cMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0, rx: 0, ry: 0
            });
        }
        this._confIdx = 0;
        this._lastConf = 0;

        // Party horn particles (cone shapes)
        this._horns = [];
        var hornGeo = new THREE.ConeGeometry(0.015, 0.06, 6);
        for (var h = 0; h < 6; h++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: h % 2 === 0 ? 0xffdd44 : 0xff4488, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hMesh = new THREE.Mesh(hornGeo, hMat);
            hMesh.visible = false;
            scene.add(hMesh);
            this._horns.push({
                mesh: hMesh,
                angle: (h / 6) * Math.PI * 2,
                dist: 0.2 + h * 0.03,
                active: false
            });
        }

        // Neighbor spheres that rattle
        this._neighbors = [];
        var nGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var n = 0; n < 5; n++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: 0x8899aa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var nMesh = new THREE.Mesh(nGeo, nMat);
            nMesh.visible = false;
            scene.add(nMesh);
            this._neighbors.push({
                mesh: nMesh,
                baseX: ox + 0.6 + n * 0.08,
                baseY: oy - 0.1 + (Math.random() - 0.5) * 0.15,
                rattleIntensity: 0
            });
        }

        // Carnival glow
        var carnGeo = new THREE.SphereGeometry(0.4, 10, 10);
        var carnMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._carnivalGlow = new THREE.Mesh(carnGeo, carnMat);
        this._carnivalGlow.position.set(ox, oy, 0);
        scene.add(this._carnivalGlow);
    },
    _emitWave(x, y, dirX, dirY) {
        var w = this._waves[this._waveIdx % this._waves.length];
        this._waveIdx++;
        w.mesh.visible = true;
        w.mesh.position.set(x, y, 0);
        w.mesh.scale.setScalar(1);
        w.startX = x;
        w.startY = y;
        w.dirX = dirX;
        w.dirY = dirY;
        w.speed = 2 + Math.random() * 2;
        w.life = 0.8 + Math.random() * 0.4;
        w.maxLife = w.life;
        w.mesh.material.opacity = 0.7;
    },
    _burstConfetti(x, y, count) {
        for (var i = 0; i < count; i++) {
            var c = this._confetti[this._confIdx % this._confetti.length];
            this._confIdx++;
            c.mesh.visible = true;
            c.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 3;
            c.vx = Math.cos(angle) * spd;
            c.vy = Math.sin(angle) * spd * 0.8 + 2;
            c.vz = (Math.random() - 0.5) * 1.0;
            c.rx = (Math.random() - 0.5) * 10;
            c.ry = (Math.random() - 0.5) * 10;
            c.life = 1.2 + Math.random() * 0.8;
            c.maxLife = c.life;
            c.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.06) {
            // Phase 1: Build up
            var t = progress / 0.06;
            model.scale.set(gs * (1 + t * 0.05), gs * (1 - t * 0.08), gs);
            model.position.set(ox, oy - t * 0.02, oz);

            // Neighbors appear
            for (var n = 0; n < this._neighbors.length; n++) {
                var nb = this._neighbors[n];
                nb.mesh.visible = true;
                nb.mesh.material.opacity = t * 0.5;
                nb.mesh.position.set(nb.baseX, nb.baseY, 0);
            }
            this._carnivalGlow.material.opacity = t * 0.05;
        } else if (progress < 0.20) {
            // Phase 2: First explosion of sound and confetti
            var t2 = (progress - 0.06) / 0.14;

            model.position.set(ox, oy + Math.abs(Math.sin(time * 8)) * 0.06, oz);
            model.scale.set(gs * (1 + Math.sin(time * 10) * 0.04), gs * (1 - Math.sin(time * 10) * 0.03), gs);
            model.rotation.z = Math.sin(time * 6) * 0.08;

            // Blast sound waves in all directions
            if (time - this._lastWave > 0.08) {
                var angle = Math.random() * Math.PI * 2;
                this._emitWave(ox, oy, Math.cos(angle), Math.sin(angle));
                this._lastWave = time;
            }

            // Confetti burst
            if (time - this._lastConf > 0.15) {
                this._burstConfetti(ox, oy + 0.1, 5);
                this._lastConf = time;
            }

            // Party horns appear
            for (var h = 0; h < this._horns.length; h++) {
                var horn = this._horns[h];
                horn.mesh.visible = true;
                horn.mesh.material.opacity = t2 * 0.6;
                horn.angle += delta * 2;
                horn.mesh.position.set(
                    ox + Math.cos(horn.angle) * horn.dist,
                    oy + Math.sin(horn.angle) * horn.dist * 0.5 + 0.1,
                    0
                );
                horn.mesh.rotation.z = horn.angle - Math.PI / 2;
            }

            // Neighbors rattle
            for (var n2 = 0; n2 < this._neighbors.length; n2++) {
                var nb2 = this._neighbors[n2];
                nb2.rattleIntensity = t2;
                nb2.mesh.position.set(
                    nb2.baseX + Math.sin(time * 15 + n2 * 2) * 0.01 * nb2.rattleIntensity,
                    nb2.baseY + Math.cos(time * 12 + n2 * 1.5) * 0.01 * nb2.rattleIntensity,
                    0
                );
            }

            this._carnivalGlow.material.opacity = 0.05 + t2 * 0.1;
        } else if (progress < 0.55) {
            // Phase 3: Maximum noise and chaos
            var t3 = (progress - 0.20) / 0.35;

            // Model jumps up and down
            var jump = Math.abs(Math.sin(time * 10)) * 0.1;
            model.position.set(ox + Math.sin(time * 4) * 0.03, oy + jump, oz);
            model.rotation.z = Math.sin(time * 7) * 0.1;
            model.scale.set(
                gs * (1 + Math.sin(time * 12) * 0.05),
                gs * (1 - Math.sin(time * 12) * 0.04 + jump * 0.3),
                gs
            );

            // Waves blast continuously
            if (time - this._lastWave > 0.05) {
                var angle2 = Math.random() * Math.PI * 2;
                this._emitWave(model.position.x, model.position.y, Math.cos(angle2), Math.sin(angle2));
                this._lastWave = time;
            }

            // Confetti cascades
            if (time - this._lastConf > 0.08) {
                this._burstConfetti(ox + (Math.random() - 0.5) * 0.3, oy + 0.1, 3);
                this._lastConf = time;
            }

            // Horns spin and blast
            for (var h2 = 0; h2 < this._horns.length; h2++) {
                var horn2 = this._horns[h2];
                horn2.mesh.material.opacity = 0.6 + Math.sin(time * 8 + h2) * 0.2;
                horn2.angle += delta * 3;
                var hDist = horn2.dist + Math.sin(time * 4 + h2) * 0.05;
                horn2.mesh.position.set(
                    model.position.x + Math.cos(horn2.angle) * hDist,
                    model.position.y + Math.sin(horn2.angle) * hDist * 0.5,
                    0
                );
                horn2.mesh.rotation.z = horn2.angle - Math.PI / 2;
                horn2.mesh.scale.setScalar(1 + Math.sin(time * 6 + h2 * 2) * 0.3);
            }

            // Neighbors rattle hard
            for (var n3 = 0; n3 < this._neighbors.length; n3++) {
                var nb3 = this._neighbors[n3];
                nb3.mesh.material.opacity = 0.5;
                nb3.mesh.position.set(
                    nb3.baseX + Math.sin(time * 20 + n3 * 3) * 0.02,
                    nb3.baseY + Math.cos(time * 18 + n3 * 2) * 0.02,
                    0
                );
            }

            this._carnivalGlow.material.opacity = 0.15 + Math.sin(time * 4) * 0.05;
            this._carnivalGlow.position.set(model.position.x, model.position.y, 0);
        } else if (progress < 0.72) {
            // Phase 4: Cacophony peak then starts calming
            var t4 = (progress - 0.55) / 0.17;
            var calm = t4 * t4;

            var jumpDecay = Math.abs(Math.sin(time * 10)) * 0.1 * (1 - calm);
            model.position.set(
                ox + Math.sin(time * 4) * 0.03 * (1 - calm),
                oy + jumpDecay,
                oz
            );
            model.rotation.z = Math.sin(time * 7) * 0.1 * (1 - calm);
            model.scale.setScalar(gs);

            // Waves slow down
            if (time - this._lastWave > 0.08 + calm * 0.2) {
                var angle3 = Math.random() * Math.PI * 2;
                this._emitWave(model.position.x, model.position.y, Math.cos(angle3), Math.sin(angle3));
                this._lastWave = time;
            }

            // Horns fade
            for (var h3 = 0; h3 < this._horns.length; h3++) {
                this._horns[h3].mesh.material.opacity = 0.6 * (1 - calm);
            }

            // Neighbors calm
            for (var n4 = 0; n4 < this._neighbors.length; n4++) {
                var nb4 = this._neighbors[n4];
                nb4.mesh.position.set(
                    nb4.baseX + Math.sin(time * 20 + n4 * 3) * 0.02 * (1 - calm),
                    nb4.baseY + Math.cos(time * 18 + n4 * 2) * 0.02 * (1 - calm),
                    0
                );
            }

            this._carnivalGlow.material.opacity = 0.15 * (1 - calm);
        } else if (progress < 0.88) {
            // Phase 5: Shush - everything settles
            var t5 = (progress - 0.72) / 0.16;

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.setScalar(gs);

            for (var h4 = 0; h4 < this._horns.length; h4++) {
                this._horns[h4].mesh.material.opacity = 0;
                this._horns[h4].mesh.visible = false;
            }

            for (var n5 = 0; n5 < this._neighbors.length; n5++) {
                this._neighbors[n5].mesh.material.opacity = 0.5 * (1 - t5);
            }

            this._carnivalGlow.material.opacity = 0;
        } else {
            // Phase 6: Final fade
            var t6 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var n6 = 0; n6 < this._neighbors.length; n6++) {
                this._neighbors[n6].mesh.visible = false;
            }
        }

        // Update sound wave rings
        for (var wi = 0; wi < this._waves.length; wi++) {
            var wave = this._waves[wi];
            if (wave.life <= 0) continue;
            wave.life -= delta;
            if (wave.life <= 0) { wave.mesh.visible = false; continue; }
            var lr = wave.life / wave.maxLife;
            wave.mesh.position.x += wave.dirX * wave.speed * delta;
            wave.mesh.position.y += wave.dirY * wave.speed * delta;
            wave.mesh.scale.setScalar(1 + (1 - lr) * 4);
            wave.mesh.material.opacity = lr * 0.6;
        }

        // Update confetti
        for (var ci = 0; ci < this._confetti.length; ci++) {
            var conf = this._confetti[ci];
            if (conf.life <= 0) continue;
            conf.life -= delta;
            if (conf.life <= 0) { conf.mesh.visible = false; continue; }
            conf.mesh.position.x += conf.vx * delta;
            conf.mesh.position.y += conf.vy * delta;
            conf.mesh.position.z += conf.vz * delta;
            conf.vy -= 3.0 * delta;
            conf.vx += Math.sin(time * 5 + ci) * 0.5 * delta;
            conf.mesh.rotation.x += conf.rx * delta;
            conf.mesh.rotation.y += conf.ry * delta;
            conf.mesh.material.opacity = (conf.life / conf.maxLife) * 0.8;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._waves) { this._waves.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._confetti) { this._confetti.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._horns) { this._horns.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._neighbors) { this._neighbors.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); }); }
        if (this._carnivalGlow) { scene.remove(this._carnivalGlow); this._carnivalGlow.geometry.dispose(); this._carnivalGlow.material.dispose(); }
        this._waves = this._confetti = this._horns = this._neighbors = this._carnivalGlow = null;
    }
};
