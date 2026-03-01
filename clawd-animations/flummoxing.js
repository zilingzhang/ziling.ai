export default {
    name: 'Flummoxing',
    label: 'flummoxing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Problem cube (red, unfolds into fractal-like complexity)
        this._cubes = [];
        var cubeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        // Main cube + 26 sub-cubes for fractal unfolding
        for (var i = 0; i < 27; i++) {
            var shade = i === 0 ? 0xff4444 : (0xcc3333 + (i * 0x050202));
            var cMat = new THREE.MeshBasicMaterial({
                color: shade, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cMesh = new THREE.Mesh(cubeGeo, cMat);
            cMesh.visible = false;
            scene.add(cMesh);

            // Compute grid positions for 3x3x3
            var gx = (i % 3) - 1;
            var gy = (Math.floor(i / 3) % 3) - 1;
            var gz = Math.floor(i / 9) - 1;
            this._cubes.push({
                mesh: cMesh,
                gridX: gx, gridY: gy, gridZ: gz,
                unfolded: false
            });
        }
        this._cubeCenter = { x: ox + 0.4, y: oy + 0.05 };

        // Head scratch particles
        this._scratches = [];
        var scrGeo = new THREE.BoxGeometry(0.005, 0.015, 0.002);
        for (var s = 0; s < 8; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffddaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(scrGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._scratches.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._scrIdx = 0;
        this._lastScr = 0;

        // Overwhelm burst particles
        this._burstParts = [];
        var bGeo = new THREE.OctahedronGeometry(0.012, 0);
        for (var b = 0; b < 20; b++) {
            var bColors = [0xff6666, 0xff8888, 0xffaaaa, 0xff4444, 0xffcccc];
            var bMat = new THREE.MeshBasicMaterial({
                color: bColors[b % 5], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bMesh = new THREE.Mesh(bGeo, bMat);
            bMesh.visible = false;
            scene.add(bMesh);
            this._burstParts.push({
                mesh: bMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }

        // Surrender glow
        var surrGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var surrMat = new THREE.MeshBasicMaterial({
            color: 0xffcccc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._surrenderGlow = new THREE.Mesh(surrGeo, surrMat);
        this._surrenderGlow.position.set(ox, oy, 0);
        scene.add(this._surrenderGlow);

        this._unfoldLevel = 0;
        this._overwhelmed = false;
    },
    _emitScratch(x, y) {
        var s = this._scratches[this._scrIdx % this._scratches.length];
        this._scrIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.04, y + 0.1, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.3 + Math.random() * 0.3;
        s.life = 0.3 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.5;
    },
    _overwhelmBurst(x, y) {
        for (var i = 0; i < this._burstParts.length; i++) {
            var p = this._burstParts[i];
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.vz = (Math.random() - 0.5) * 1.0;
            p.life = 0.6 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var cx = this._cubeCenter.x;
        var cy = this._cubeCenter.y;

        if (progress < 0.10) {
            // Phase 1: Problem cube appears, model approaches confidently
            var t = progress / 0.10;
            // Only show main cube (index 0)
            this._cubes[0].mesh.visible = true;
            this._cubes[0].mesh.material.opacity = t * 0.7;
            this._cubes[0].mesh.position.set(cx, cy, 0);
            this._cubes[0].mesh.rotation.y = time * 1.5;

            model.position.set(ox + t * 0.1, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.25) {
            // Phase 2: Model reaches cube, first unfold - 8 cubes appear
            var t2 = (progress - 0.10) / 0.15;

            model.position.set(ox + 0.1, oy, oz);
            model.rotation.z = 0;

            // Main cube
            this._cubes[0].mesh.material.opacity = 0.7;
            this._cubes[0].mesh.position.set(cx, cy, 0);
            this._cubes[0].mesh.rotation.y = time * 1.5;

            // First ring of sub-cubes unfold
            var unfoldCount = Math.floor(t2 * 8) + 1;
            var spacing = 0.07;
            for (var i = 1; i < Math.min(unfoldCount + 1, 9); i++) {
                var cube = this._cubes[i];
                cube.mesh.visible = true;
                var unfoldT = Math.min(1, (t2 * 8 - (i - 1)) * 2);
                cube.mesh.material.opacity = unfoldT * 0.5;
                var dist = unfoldT * spacing * 1.5;
                cube.mesh.position.set(
                    cx + cube.gridX * dist,
                    cy + cube.gridY * dist,
                    cube.gridZ * dist * 0.3
                );
                cube.mesh.rotation.y = time * 2 + i * 0.5;
                cube.mesh.rotation.x = time * 1.5 + i * 0.3;
                cube.mesh.scale.setScalar(unfoldT * 0.7);
            }
        } else if (progress < 0.40) {
            // Phase 3: Model recoils, scratches head, more cubes unfold
            var t3 = (progress - 0.25) / 0.15;

            // Model recoils
            model.position.set(ox + 0.1 - t3 * 0.08, oy, oz);
            model.rotation.z = t3 * 0.05;

            // Scratch head
            if (time - this._lastScr > 0.15) {
                this._emitScratch(model.position.x, oy);
                this._lastScr = time;
            }

            // More cubes unfold
            var spacing2 = 0.08;
            for (var j = 1; j < 19; j++) {
                var cube2 = this._cubes[j];
                cube2.mesh.visible = true;
                cube2.mesh.material.opacity = 0.5;
                var dist2 = spacing2 * 1.5;
                cube2.mesh.position.set(
                    cx + cube2.gridX * dist2 + Math.sin(time * 2 + j) * 0.01,
                    cy + cube2.gridY * dist2 + Math.cos(time * 1.8 + j) * 0.01,
                    cube2.gridZ * dist2 * 0.3
                );
                cube2.mesh.rotation.y = time * 2 + j * 0.3;
                cube2.mesh.scale.setScalar(0.7);
            }

            this._surrenderGlow.material.opacity = t3 * 0.05;
        } else if (progress < 0.55) {
            // Phase 4: Try again - approach, even more complexity
            var t4 = (progress - 0.40) / 0.15;

            if (t4 < 0.4) {
                // Approach again
                model.position.set(ox + 0.02 + t4 * 0.1, oy, oz);
                model.rotation.z = 0;
            } else {
                // Full fractal explosion
                model.position.set(ox + 0.06, oy, oz);
                model.rotation.z = (t4 - 0.4) * -0.08;
            }

            // All 27 cubes visible, expanding
            var expansion = 0.08 + t4 * 0.04;
            for (var k = 0; k < 27; k++) {
                var cube3 = this._cubes[k];
                cube3.mesh.visible = true;
                cube3.mesh.material.opacity = 0.5 + Math.sin(time * 3 + k) * 0.1;
                cube3.mesh.position.set(
                    cx + cube3.gridX * expansion + Math.sin(time * 2 + k * 0.7) * 0.015,
                    cy + cube3.gridY * expansion + Math.cos(time * 1.8 + k * 0.5) * 0.015,
                    cube3.gridZ * expansion * 0.4
                );
                cube3.mesh.rotation.y = time * 2 + k * 0.2;
                cube3.mesh.rotation.x = time * 1.5 + k * 0.15;
                cube3.mesh.scale.setScalar(0.6 + Math.sin(time * 4 + k) * 0.1);
            }

            this._surrenderGlow.material.opacity = 0.05 + t4 * 0.05;
        } else if (progress < 0.72) {
            // Phase 5: Overwhelmed - cubes expand wildly, model backs away
            var t5 = (progress - 0.55) / 0.17;

            model.position.set(ox + 0.06 - t5 * 0.15, oy - t5 * 0.02, oz);
            model.rotation.z = -t5 * 0.1;

            // Cubes expand and rotate faster
            var expansion2 = 0.12 + t5 * 0.08;
            for (var m = 0; m < 27; m++) {
                var cube4 = this._cubes[m];
                cube4.mesh.material.opacity = 0.6;
                cube4.mesh.position.set(
                    cx + cube4.gridX * expansion2 + Math.sin(time * 3 + m * 0.5) * 0.02,
                    cy + cube4.gridY * expansion2 + Math.cos(time * 2.5 + m * 0.4) * 0.02,
                    cube4.gridZ * expansion2 * 0.5
                );
                cube4.mesh.rotation.y = time * 3 + m * 0.3;
                cube4.mesh.rotation.x = time * 2 + m * 0.2;
                cube4.mesh.scale.setScalar(0.6 + t5 * 0.2 + Math.sin(time * 5 + m) * 0.1);
            }

            // Overwhelm burst at peak
            if (t5 > 0.8 && !this._overwhelmed) {
                this._overwhelmed = true;
                this._overwhelmBurst(cx, cy);
            }

            this._surrenderGlow.material.opacity = 0.1 + t5 * 0.1;
            this._surrenderGlow.position.set(model.position.x, model.position.y, 0);
        } else if (progress < 0.88) {
            // Phase 6: Surrender - model slumps, cubes pulse smugly
            var t6 = (progress - 0.72) / 0.16;

            model.position.set(ox - 0.09, oy - 0.02, oz);
            model.rotation.z = -0.1 + Math.sin(time * 1.5) * 0.02;
            model.scale.set(gs * (1 - t6 * 0.03), gs * (1 + t6 * 0.02), gs);

            // Cubes contract smugly
            var contract = 0.2 - t6 * 0.1;
            for (var n = 0; n < 27; n++) {
                var cube5 = this._cubes[n];
                cube5.mesh.material.opacity = 0.6 * (1 - t6 * 0.3);
                cube5.mesh.position.set(
                    cx + cube5.gridX * contract,
                    cy + cube5.gridY * contract,
                    cube5.gridZ * contract * 0.3
                );
                cube5.mesh.rotation.y = time * 1.5 + n * 0.2;
                cube5.mesh.scale.setScalar(0.8 - t6 * 0.2);
            }

            this._surrenderGlow.material.opacity = 0.2 * (1 - t6);
            this._surrenderGlow.position.set(model.position.x, model.position.y, 0);
        } else {
            // Phase 7: Fade out
            var t7 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var p = 0; p < 27; p++) {
                this._cubes[p].mesh.material.opacity = 0.4 * (1 - t7);
            }
            this._surrenderGlow.material.opacity = 0;
        }

        // Update scratch particles
        for (var si = 0; si < this._scratches.length; si++) {
            var scr = this._scratches[si];
            if (scr.life <= 0) continue;
            scr.life -= delta;
            if (scr.life <= 0) { scr.mesh.visible = false; continue; }
            scr.mesh.position.x += scr.vx * delta;
            scr.mesh.position.y += scr.vy * delta;
            scr.mesh.material.opacity = (scr.life / scr.maxLife) * 0.4;
        }

        // Update burst particles
        for (var bi = 0; bi < this._burstParts.length; bi++) {
            var bp = this._burstParts[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            bp.mesh.position.z += bp.vz * delta;
            bp.vy -= 1.5 * delta;
            bp.mesh.material.opacity = (bp.life / bp.maxLife) * 0.8;
            bp.mesh.rotation.z = time * 5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cubes) { this._cubes.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._scratches) { this._scratches.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._burstParts) { this._burstParts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._surrenderGlow) { scene.remove(this._surrenderGlow); this._surrenderGlow.geometry.dispose(); this._surrenderGlow.material.dispose(); }
        this._cubes = this._scratches = this._burstParts = this._surrenderGlow = null;
    }
};
