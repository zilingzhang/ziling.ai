export default {
    name: 'Percolating',
    label: 'percolating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Percolator body (lower cylinder)
        var bodyGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.2, 14);
        var bodyMat = new THREE.MeshBasicMaterial({
            color: 0x777777, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._body = new THREE.Mesh(bodyGeo, bodyMat);
        this._body.position.set(ox - 0.3, oy - 0.22, 0);
        scene.add(this._body);

        // Percolator top (upper cylinder)
        var topGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 14);
        var topMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._top = new THREE.Mesh(topGeo, topMat);
        this._top.position.set(ox - 0.3, oy - 0.05, 0);
        scene.add(this._top);

        // Glass dome (transparent top)
        var domeGeo = new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        var domeMat = new THREE.MeshBasicMaterial({
            color: 0xaaccdd, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._dome = new THREE.Mesh(domeGeo, domeMat);
        this._dome.position.set(ox - 0.3, oy + 0.02, 0);
        scene.add(this._dome);

        // Filter disc (middle separator)
        var filterGeo = new THREE.CircleGeometry(0.13, 14);
        var filterMat = new THREE.MeshBasicMaterial({
            color: 0x665544, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._filter = new THREE.Mesh(filterGeo, filterMat);
        this._filter.position.set(ox - 0.3, oy - 0.12, 0);
        scene.add(this._filter);

        // Water/coffee color fill (cylinder inside that changes color top-down)
        var fillGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.18, 12);
        var fillMat = new THREE.MeshBasicMaterial({
            color: 0xccddee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._fill = new THREE.Mesh(fillGeo, fillMat);
        this._fill.position.set(ox - 0.3, oy - 0.22, 0);
        scene.add(this._fill);

        // Rising water drops (upward particles through filter)
        this._drops = [];
        var dropGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var i = 0; i < 20; i++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0x664422, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dMesh = new THREE.Mesh(dropGeo, dMat);
            dMesh.visible = false;
            scene.add(dMesh);
            this._drops.push({
                mesh: dMesh, life: 0, maxLife: 0,
                vy: 0, baseX: 0
            });
        }
        this._dropIdx = 0;

        // Bubble-up rhythm particles (in the dome)
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var j = 0; j < 15; j++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0x885522, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bMesh = new THREE.Mesh(bubGeo, bMat);
            bMesh.visible = false;
            scene.add(bMesh);
            this._bubbles.push({
                mesh: bMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._bubIdx = 0;

        // Steam wisps from top
        this._steam = [];
        var steamGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var k = 0; k < 12; k++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xddccbb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(steamGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._steam.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._steamIdx = 0;

        // Warm amber glow
        var glowGeo = new THREE.SphereGeometry(0.25, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xaa6633, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.3, oy - 0.15, 0);
        scene.add(this._glow);

        this._lastDrop = 0;
        this._lastBub = 0;
    },
    _spawnDrop(x, y) {
        var d = this._drops[this._dropIdx % this._drops.length];
        this._dropIdx++;
        d.mesh.visible = true;
        d.baseX = x + (Math.random() - 0.5) * 0.12;
        d.mesh.position.set(d.baseX, y, 0);
        d.vy = 0.2 + Math.random() * 0.15;
        d.life = 0.6 + Math.random() * 0.4;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.5;
    },
    _spawnBubble(x, y) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y, 0);
        b.vx = (Math.random() - 0.5) * 0.08;
        b.vy = 0.15 + Math.random() * 0.1;
        b.life = 0.3 + Math.random() * 0.3;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.5;
    },
    _spawnSteam(x, y) {
        var s = this._steam[this._steamIdx % this._steam.length];
        this._steamIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.06, y, 0);
        s.baseX = s.mesh.position.x;
        s.vx = 0;
        s.vy = 0.25 + Math.random() * 0.2;
        s.life = 0.7 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.3;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var percX = ox - 0.3;

        if (progress < 0.10) {
            // Phase 1: Percolator appears
            var t = progress / 0.10;
            var ease = t * t;
            this._body.material.opacity = ease * 0.6;
            this._top.material.opacity = ease * 0.5;
            this._dome.material.opacity = ease * 0.3;
            this._filter.material.opacity = ease * 0.4;
            this._fill.material.opacity = ease * 0.15;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Water rises through filter, drops ascend
            var t2 = (progress - 0.10) / 0.30;
            this._body.material.opacity = 0.6;
            this._top.material.opacity = 0.5;
            this._dome.material.opacity = 0.3;

            // Drops rise upward through filter
            if (time - this._lastDrop > 0.15 - t2 * 0.08) {
                this._spawnDrop(percX, oy - 0.3);
                this._lastDrop = time;
            }

            // Coffee color starts spreading (fill darkens)
            var coffeeR = 0.8 - t2 * 0.4;
            var coffeeG = 0.87 - t2 * 0.5;
            var coffeeB = 0.93 - t2 * 0.7;
            this._fill.material.color.setRGB(coffeeR, coffeeG, coffeeB);
            this._fill.material.opacity = 0.15 + t2 * 0.15;

            // Warm glow starts
            this._glow.material.opacity = t2 * 0.1;

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.01, oz);
        } else if (progress < 0.70) {
            // Phase 3: Full percolation rhythm, bubbles in dome, color deepens
            var t3 = (progress - 0.40) / 0.30;

            // Rhythmic drops - faster
            if (time - this._lastDrop > 0.08) {
                this._spawnDrop(percX, oy - 0.3);
                this._lastDrop = time;
            }

            // Bubble-up in dome with rhythm
            var rhythm = Math.sin(time * 4);
            if (rhythm > 0.7 && time - this._lastBub > 0.12) {
                this._spawnBubble(percX, oy - 0.02);
                this._lastBub = time;
            }

            // Dark coffee color
            this._fill.material.color.setRGB(0.4 - t3 * 0.15, 0.37 - t3 * 0.12, 0.23 - t3 * 0.1);
            this._fill.material.opacity = 0.3 + t3 * 0.15;

            // Steam begins
            if (Math.random() < 0.04 + t3 * 0.04) {
                this._spawnSteam(percX, oy + 0.08);
            }

            // Warm glow
            this._glow.material.opacity = 0.1 + t3 * 0.15 + Math.sin(time * 3) * 0.05;

            // Dome takes on amber tint
            this._dome.material.color.setRGB(
                0.67 + t3 * 0.2,
                0.8 - t3 * 0.15,
                0.87 - t3 * 0.35
            );

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = Math.sin(time * 1) * 0.02;
        } else if (progress < 0.88) {
            // Phase 4: Rich brew complete, aromatic steam
            var t4 = (progress - 0.70) / 0.18;

            // Rich brown color
            this._fill.material.color.setRGB(0.25, 0.18, 0.1);
            this._fill.material.opacity = 0.45;

            // Slower percolation
            if (time - this._lastDrop > 0.2) {
                this._spawnDrop(percX, oy - 0.3);
                this._lastDrop = time;
            }

            // Rich steam
            if (Math.random() < 0.06) {
                this._spawnSteam(percX, oy + 0.08);
            }

            // Glow pulses warmly
            this._glow.material.opacity = 0.25 + Math.sin(time * 2) * 0.08;

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.88) / 0.12;
            this._body.material.opacity = 0.6 * (1 - t5);
            this._top.material.opacity = 0.5 * (1 - t5);
            this._dome.material.opacity = 0.3 * (1 - t5);
            this._filter.material.opacity = 0.4 * (1 - t5);
            this._fill.material.opacity = 0.45 * (1 - t5);
            this._glow.material.opacity = 0.25 * (1 - t5);

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update drops
        for (var di = 0; di < this._drops.length; di++) {
            var dp = this._drops[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.x = dp.baseX + Math.sin(time * 8 + di * 3) * 0.005;
            var dlr = dp.life / dp.maxLife;
            dp.mesh.material.opacity = dlr * 0.5;
            dp.mesh.scale.setScalar(0.5 + (1 - dlr) * 0.5);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            var blr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = blr * 0.4;
            bb.mesh.scale.setScalar(0.5 + (1 - blr) * 0.8);
        }

        // Update steam
        for (var si = 0; si < this._steam.length; si++) {
            var sp = this._steam[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.x = sp.baseX + Math.sin(time * 2.5 + si * 2) * 0.03;
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr * 0.25;
            sp.mesh.scale.setScalar(0.5 + (1 - slr) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._body) { scene.remove(this._body); this._body.geometry.dispose(); this._body.material.dispose(); }
        if (this._top) { scene.remove(this._top); this._top.geometry.dispose(); this._top.material.dispose(); }
        if (this._dome) { scene.remove(this._dome); this._dome.geometry.dispose(); this._dome.material.dispose(); }
        if (this._filter) { scene.remove(this._filter); this._filter.geometry.dispose(); this._filter.material.dispose(); }
        if (this._fill) { scene.remove(this._fill); this._fill.geometry.dispose(); this._fill.material.dispose(); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._drops) { this._drops.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._steam) { this._steam.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._body = this._top = this._dome = this._filter = this._fill = this._glow = this._drops = this._bubbles = this._steam = null;
    }
};
