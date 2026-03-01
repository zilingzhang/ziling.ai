export default {
    name: 'Crunching',
    label: 'crunching',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Crusher plates (two approaching flat boxes)
        var plateGeo = new THREE.BoxGeometry(0.4, 0.04, 0.15);
        var topPlateMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._topPlate = new THREE.Mesh(plateGeo, topPlateMat);
        this._topPlate.position.set(ox - 0.2, oy + 0.15, 0);
        scene.add(this._topPlate);

        var botPlateMat = new THREE.MeshBasicMaterial({
            color: 0x777777, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._botPlate = new THREE.Mesh(plateGeo, botPlateMat);
        this._botPlate.position.set(ox - 0.2, oy - 0.25, 0);
        scene.add(this._botPlate);

        // Data blocks (cubes to be crushed)
        this._dataBlocks = [];
        var blockGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        var blockColors = [0xff8844, 0xff6633, 0xee7744, 0xffaa55, 0xff9944, 0xdd6622];
        for (var i = 0; i < 6; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: blockColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var block = new THREE.Mesh(blockGeo, bMat);
            block.position.set(ox - 0.6 + i * 0.08, oy - 0.05, 0);
            block.visible = false;
            scene.add(block);
            this._dataBlocks.push({
                mesh: block, crushed: false,
                origY: oy - 0.05
            });
        }

        // Compression sparks
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var j = 0; j < 25; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0xffaa44 : (j % 3 === 1 ? 0xff6622 : 0xffdd66),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Numbers rain particles
        this._numbers = [];
        var numGeo = new THREE.BoxGeometry(0.02, 0.025, 0.005);
        for (var n = 0; n < 20; n++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: n % 2 === 0 ? 0xaaaaaa : 0x888888,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var num = new THREE.Mesh(numGeo, nMat);
            num.visible = false;
            scene.add(num);
            this._numbers.push({
                mesh: num, speed: 0.5 + Math.random() * 1,
                col: (n % 8 - 4) * 0.1
            });
        }

        // Dense output nugget (small bright sphere)
        var nugGeo = new THREE.SphereGeometry(0.05, 10, 10);
        var nugMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._nugget = new THREE.Mesh(nugGeo, nugMat);
        this._nugget.position.set(ox + 0.2, oy - 0.05, 0);
        scene.add(this._nugget);

        // Pressure gauge (arc)
        this._gaugeSegments = [];
        var gaugeGeo = new THREE.BoxGeometry(0.03, 0.008, 0.005);
        for (var g = 0; g < 10; g++) {
            var gMat = new THREE.MeshBasicMaterial({
                color: g < 4 ? 0x44ff44 : (g < 7 ? 0xffaa22 : 0xff4422),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var seg = new THREE.Mesh(gaugeGeo, gMat);
            var gaugeAngle = (g / 10) * Math.PI - Math.PI * 0.5;
            seg.position.set(
                ox + 0.5 + Math.cos(gaugeAngle) * 0.12,
                oy + 0.2 + Math.sin(gaugeAngle) * 0.12,
                0
            );
            seg.rotation.z = gaugeAngle + Math.PI * 0.5;
            scene.add(seg);
            this._gaugeSegments.push(seg);
        }

        this._crushPhase = 0;
        this._pressure = 0;
    },
    _burstSparks(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.0 + Math.random() * 2.0;
            s.vx = Math.cos(angle) * speed;
            s.vy = Math.sin(angle) * speed;
            s.life = 0.2 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Crusher and blocks appear
            var t = progress / 0.08;
            this._topPlate.material.opacity = t * 0.6;
            this._botPlate.material.opacity = t * 0.6;
            for (var i = 0; i < this._dataBlocks.length; i++) {
                this._dataBlocks[i].mesh.visible = true;
                this._dataBlocks[i].mesh.material.opacity = t * 0.7;
            }
            model.position.set(ox + 0.3, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Blocks fed into crusher
            var t2 = (progress - 0.08) / 0.17;
            for (var j = 0; j < this._dataBlocks.length; j++) {
                var block = this._dataBlocks[j];
                block.mesh.material.opacity = 0.7;
                // Move blocks toward crusher
                var moveT = Math.max(0, t2 - j * 0.1) / (1 - j * 0.1);
                moveT = Math.min(moveT, 1);
                block.mesh.position.x = (ox - 0.6 + j * 0.08) + moveT * (0.4 - j * 0.04);
            }

            // Numbers rain starts
            for (var n = 0; n < this._numbers.length; n++) {
                this._numbers[n].mesh.visible = t2 > 0.3;
                this._numbers[n].mesh.position.x = ox + this._numbers[n].col;
                this._numbers[n].mesh.position.y -= this._numbers[n].speed * delta;
                if (this._numbers[n].mesh.position.y < oy - 0.6) {
                    this._numbers[n].mesh.position.y = oy + 0.5;
                }
                this._numbers[n].mesh.material.opacity = 0.2 * t2;
            }

            model.position.set(ox + 0.3, oy + Math.sin(time * 2) * 0.01, oz);
        } else if (progress < 0.70) {
            // Phase 3: Crushing - plates compress, blocks flatten, sparks
            var t3 = (progress - 0.25) / 0.45;
            this._pressure = t3;

            // Plates close
            var gap = 0.4 * (1 - t3 * 0.8);
            this._topPlate.position.y = oy + gap * 0.5;
            this._botPlate.position.y = oy - gap * 0.5 - 0.1;

            // Blocks compress and merge
            for (var k = 0; k < this._dataBlocks.length; k++) {
                var bl = this._dataBlocks[k];
                bl.mesh.position.x = ox - 0.2 + (k - 2.5) * 0.03 * (1 - t3);
                bl.mesh.scale.y = Math.max(0.1, 1 - t3 * 0.85);
                bl.mesh.scale.x = 1 + t3 * 0.3;
                bl.mesh.material.opacity = 0.7 * (1 - t3 * 0.5);
            }

            // Compression sparks on each crush pulse
            if (Math.sin(time * 8) > 0.9 && Math.random() < 0.5) {
                this._burstSparks(ox - 0.2, oy - 0.05, 3);
            }

            // Pressure gauge fills
            for (var g = 0; g < this._gaugeSegments.length; g++) {
                var fillLevel = t3 * 10;
                this._gaugeSegments[g].material.opacity = g < fillLevel ? 0.7 : 0.1;
            }

            // Numbers rain
            for (var n2 = 0; n2 < this._numbers.length; n2++) {
                this._numbers[n2].mesh.position.y -= this._numbers[n2].speed * delta;
                if (this._numbers[n2].mesh.position.y < oy - 0.6) {
                    this._numbers[n2].mesh.position.y = oy + 0.5;
                }
                this._numbers[n2].mesh.material.opacity = 0.2 + t3 * 0.15;
            }

            model.position.set(ox + 0.3, oy + Math.sin(time * 4) * 0.01, oz);
            model.rotation.z = Math.sin(time * 6) * 0.02;
        } else if (progress < 0.85) {
            // Phase 4: Nugget emerges, blocks gone
            var t4 = (progress - 0.70) / 0.15;

            // Plates open slightly
            this._topPlate.position.y = oy + 0.04 + t4 * 0.1;
            this._botPlate.position.y = oy - 0.14 - t4 * 0.1;

            // Blocks fade
            for (var bl2 = 0; bl2 < this._dataBlocks.length; bl2++) {
                this._dataBlocks[bl2].mesh.material.opacity *= 0.92;
            }

            // Nugget appears
            this._nugget.material.opacity = t4 * 0.9;
            this._nugget.scale.setScalar(0.5 + t4 * 0.5);
            this._nugget.position.x = ox - 0.2 + t4 * 0.4;

            // Final spark burst
            if (t4 < 0.3) {
                this._burstSparks(ox - 0.2, oy - 0.05, 2);
            }

            // Gauge still full
            for (var g2 = 0; g2 < this._gaugeSegments.length; g2++) {
                this._gaugeSegments[g2].material.opacity = 0.7 * (1 - t4 * 0.5);
            }

            model.position.set(ox + 0.3, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.85) / 0.15;
            this._topPlate.material.opacity = 0.6 * (1 - t5);
            this._botPlate.material.opacity = 0.6 * (1 - t5);
            this._nugget.material.opacity = 0.9 * (1 - t5);
            this._nugget.scale.setScalar(1.0 + Math.sin(t5 * Math.PI) * 0.2);

            for (var n3 = 0; n3 < this._numbers.length; n3++) {
                this._numbers[n3].mesh.material.opacity *= 0.92;
            }
            for (var g3 = 0; g3 < this._gaugeSegments.length; g3++) {
                this._gaugeSegments[g3].material.opacity *= 0.9;
            }

            model.position.set(ox + 0.3 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 3 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.8;
            sp.mesh.scale.setScalar(0.5 + lr * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._topPlate) { scene.remove(this._topPlate); this._topPlate.geometry.dispose(); this._topPlate.material.dispose(); }
        if (this._botPlate) { scene.remove(this._botPlate); this._botPlate.geometry.dispose(); this._botPlate.material.dispose(); }
        if (this._dataBlocks) { this._dataBlocks.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._numbers) { this._numbers.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); }); }
        if (this._nugget) { scene.remove(this._nugget); this._nugget.geometry.dispose(); this._nugget.material.dispose(); }
        if (this._gaugeSegments) { this._gaugeSegments.forEach(function(g) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); }); }
        this._topPlate = this._botPlate = this._dataBlocks = this._sparks = this._numbers = this._nugget = this._gaugeSegments = null;
    }
};
