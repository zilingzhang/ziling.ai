export default {
    name: 'Considering',
    label: 'considering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Two option spheres (left and right)
        var optGeo = new THREE.SphereGeometry(0.08, 12, 12);
        var leftMat = new THREE.MeshBasicMaterial({
            color: 0x44aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._leftOption = new THREE.Mesh(optGeo, leftMat);
        this._leftOption.position.set(ox - 0.4, oy + 0.15, 0);
        this._leftOption.visible = false;
        scene.add(this._leftOption);

        var rightMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._rightOption = new THREE.Mesh(optGeo, rightMat);
        this._rightOption.position.set(ox + 0.4, oy + 0.15, 0);
        this._rightOption.visible = false;
        scene.add(this._rightOption);

        // Weighing scale - center post (line), and beam (line)
        var postPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 0)];
        var postGeo = new THREE.BufferGeometry().setFromPoints(postPoints);
        var scaleMat = new THREE.LineBasicMaterial({
            color: 0xccccdd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        this._scalePost = new THREE.Line(postGeo, scaleMat);
        this._scalePost.position.set(ox, oy + 0.3, 0.01);
        this._scalePost.visible = false;
        scene.add(this._scalePost);

        var beamPoints = [new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0)];
        var beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
        var beamMat = new THREE.LineBasicMaterial({
            color: 0xddddee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        this._scaleBeam = new THREE.Line(beamGeo, beamMat);
        this._scaleBeam.position.set(ox, oy + 0.5, 0.01);
        this._scaleBeam.visible = false;
        scene.add(this._scaleBeam);

        // Left and right pan lines (hanging from beam)
        var leftPanPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.1, 0)];
        var leftPanGeo = new THREE.BufferGeometry().setFromPoints(leftPanPts);
        var lpMat = new THREE.LineBasicMaterial({
            color: 0x44aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        this._leftPan = new THREE.Line(leftPanGeo, lpMat);
        this._leftPan.position.set(ox - 0.25, oy + 0.5, 0.01);
        this._leftPan.visible = false;
        scene.add(this._leftPan);

        var rightPanPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.1, 0)];
        var rightPanGeo = new THREE.BufferGeometry().setFromPoints(rightPanPts);
        var rpMat = new THREE.LineBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        this._rightPan = new THREE.Line(rightPanGeo, rpMat);
        this._rightPan.position.set(ox + 0.25, oy + 0.5, 0.01);
        this._rightPan.visible = false;
        scene.add(this._rightPan);

        // Pro/Con particles (green = pro, red = con)
        this._proConParticles = [];
        var pcGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var i = 0; i < 24; i++) {
            var isPro = i % 2 === 0;
            var pcMat = new THREE.MeshBasicMaterial({
                color: isPro ? 0x44ff66 : 0xff4444,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pc = new THREE.Mesh(pcGeo, pcMat);
            pc.visible = false;
            scene.add(pc);
            this._proConParticles.push({
                mesh: pc,
                life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                isPro: isPro
            });
        }
        this._pcIdx = 0;

        // Decision glow
        var decGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var decMat = new THREE.MeshBasicMaterial({
            color: 0x88ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._decisionGlow = new THREE.Mesh(decGeo, decMat);
        this._decisionGlow.position.set(ox - 0.4, oy + 0.15, -0.02);
        this._decisionGlow.visible = false;
        scene.add(this._decisionGlow);

        this._lastPcSpawn = 0;
    },
    _spawnProCon(ox, oy, side, isPro) {
        var p = this._proConParticles[this._pcIdx % this._proConParticles.length];
        this._pcIdx++;
        p.mesh.visible = true;
        var sx = side < 0 ? ox - 0.4 : ox + 0.4;
        p.mesh.position.set(sx, oy + 0.15, 0.03);
        var a = Math.random() * Math.PI * 2;
        var spd = 0.2 + Math.random() * 0.3;
        p.vx = Math.cos(a) * spd * 0.4;
        p.vy = 0.2 + Math.random() * 0.4;
        p.vz = (Math.random() - 0.5) * 0.1;
        p.life = 0.6 + Math.random() * 0.5;
        p.maxLife = p.life;
        p.isPro = isPro;
        p.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Options appear on sides
            var t = progress / 0.10;
            this._leftOption.visible = true;
            this._rightOption.visible = true;
            this._leftOption.material.opacity = t * 0.6;
            this._rightOption.material.opacity = t * 0.6;
            this._leftOption.position.set(ox - 0.3 - t * 0.1, oy + 0.15, 0);
            this._rightOption.position.set(ox + 0.3 + t * 0.1, oy + 0.15, 0);
            this._leftOption.scale.setScalar(t);
            this._rightOption.scale.setScalar(t);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Model looks left, pro/con from left
            var t2 = (progress - 0.10) / 0.20;
            model.rotation.z = Math.sin(t2 * Math.PI * 0.5) * 0.06;
            model.position.set(ox - t2 * 0.02, oy, oz);

            this._leftOption.material.opacity = 0.6 + Math.sin(time * 3) * 0.15;
            this._rightOption.material.opacity = 0.4;
            this._leftOption.scale.setScalar(1.0 + Math.sin(time * 2) * 0.1);

            // Scale appears
            if (t2 > 0.3) {
                var sf = (t2 - 0.3) / 0.7;
                this._scalePost.visible = true;
                this._scaleBeam.visible = true;
                this._leftPan.visible = true;
                this._rightPan.visible = true;
                this._scalePost.material.opacity = sf * 0.5;
                this._scaleBeam.material.opacity = sf * 0.5;
                this._leftPan.material.opacity = sf * 0.5;
                this._rightPan.material.opacity = sf * 0.5;
            }

            // Spawn pro/con from left
            if (time - this._lastPcSpawn > 0.2) {
                this._spawnProCon(ox, oy, -1, Math.random() > 0.3);
                this._lastPcSpawn = time;
            }
        } else if (progress < 0.50) {
            // Phase 3: Model looks right, pro/con from right
            var t3 = (progress - 0.30) / 0.20;
            model.rotation.z = -Math.sin(t3 * Math.PI * 0.5) * 0.06;
            model.position.set(ox + t3 * 0.02, oy, oz);

            this._rightOption.material.opacity = 0.6 + Math.sin(time * 3) * 0.15;
            this._leftOption.material.opacity = 0.4;
            this._rightOption.scale.setScalar(1.0 + Math.sin(time * 2) * 0.1);
            this._leftOption.scale.setScalar(1.0);

            // Beam tilts
            this._scaleBeam.rotation.z = Math.sin(time * 1.5) * 0.15;
            this._scaleBeam.material.opacity = 0.5;

            if (time - this._lastPcSpawn > 0.2) {
                this._spawnProCon(ox, oy, 1, Math.random() > 0.4);
                this._lastPcSpawn = time;
            }
        } else if (progress < 0.70) {
            // Phase 4: Rapid comparison, both sides active
            var t4 = (progress - 0.50) / 0.20;
            var lookDir = Math.sin(time * 4);
            model.rotation.z = lookDir * 0.04;
            model.position.set(ox + lookDir * 0.01, oy, oz);

            this._leftOption.material.opacity = 0.6 + Math.sin(time * 4) * 0.15;
            this._rightOption.material.opacity = 0.6 - Math.sin(time * 4) * 0.15;
            this._leftOption.scale.setScalar(1.0 + Math.sin(time * 4) * 0.08);
            this._rightOption.scale.setScalar(1.0 - Math.sin(time * 4) * 0.08);

            // Beam tilts back and forth faster
            this._scaleBeam.rotation.z = Math.sin(time * 3) * 0.2 * (1 - t4 * 0.5);

            if (time - this._lastPcSpawn > 0.12) {
                this._spawnProCon(ox, oy, -1, Math.random() > 0.4);
                this._spawnProCon(ox, oy, 1, Math.random() > 0.5);
                this._lastPcSpawn = time;
            }
        } else if (progress < 0.85) {
            // Phase 5: Balance achieved, decision made (left wins)
            var t5 = (progress - 0.70) / 0.15;
            this._scaleBeam.rotation.z = -0.1 * t5;

            this._leftOption.material.opacity = 0.6 + t5 * 0.3;
            this._leftOption.scale.setScalar(1.0 + t5 * 0.3);
            this._rightOption.material.opacity = 0.6 * (1 - t5 * 0.6);
            this._rightOption.scale.setScalar(1.0 - t5 * 0.3);

            // Decision glow on left
            this._decisionGlow.visible = true;
            this._decisionGlow.material.opacity = t5 * 0.3;
            this._decisionGlow.scale.setScalar(1 + t5 * 0.5);

            model.rotation.z = t5 * 0.03;
            model.position.set(ox - t5 * 0.01, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.85) / 0.15;
            this._leftOption.material.opacity = 0.9 * (1 - t6);
            this._rightOption.material.opacity = 0.24 * (1 - t6);
            this._scalePost.material.opacity = 0.5 * (1 - t6);
            this._scaleBeam.material.opacity = 0.5 * (1 - t6);
            this._leftPan.material.opacity = 0.5 * (1 - t6);
            this._rightPan.material.opacity = 0.5 * (1 - t6);
            this._decisionGlow.material.opacity = 0.3 * (1 - t6);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0.03 * (1 - t6);
            model.scale.copy(this._origScale);
        }

        // Float options gently
        this._leftOption.position.y = oy + 0.15 + Math.sin(time * 1.5) * 0.01;
        this._rightOption.position.y = oy + 0.15 + Math.sin(time * 1.5 + Math.PI) * 0.01;

        // Update pro/con particles
        for (var pi = 0; pi < this._proConParticles.length; pi++) {
            var pp = this._proConParticles[pi];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }
            pp.mesh.position.x += pp.vx * delta;
            pp.mesh.position.y += pp.vy * delta;
            pp.mesh.position.z += pp.vz * delta;
            pp.vy -= 0.5 * delta;
            var lr = pp.life / pp.maxLife;
            pp.mesh.material.opacity = lr * 0.6;
            pp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._leftOption) { scene.remove(this._leftOption); this._leftOption.geometry.dispose(); this._leftOption.material.dispose(); }
        if (this._rightOption) { scene.remove(this._rightOption); this._rightOption.geometry.dispose(); this._rightOption.material.dispose(); }
        if (this._scalePost) { scene.remove(this._scalePost); this._scalePost.geometry.dispose(); this._scalePost.material.dispose(); }
        if (this._scaleBeam) { scene.remove(this._scaleBeam); this._scaleBeam.geometry.dispose(); this._scaleBeam.material.dispose(); }
        if (this._leftPan) { scene.remove(this._leftPan); this._leftPan.geometry.dispose(); this._leftPan.material.dispose(); }
        if (this._rightPan) { scene.remove(this._rightPan); this._rightPan.geometry.dispose(); this._rightPan.material.dispose(); }
        if (this._proConParticles) {
            this._proConParticles.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._decisionGlow) { scene.remove(this._decisionGlow); this._decisionGlow.geometry.dispose(); this._decisionGlow.material.dispose(); }
        this._leftOption = this._rightOption = this._scalePost = this._scaleBeam = null;
        this._leftPan = this._rightPan = this._proConParticles = this._decisionGlow = null;
    }
};
