export default {
    name: 'Tomfoolering',
    label: 'tomfoolering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Jester hat (three cone shapes on head)
        this._hatCones = [];
        var hatColors = [0xff4444, 0xffdd44, 0x44aa44];
        for (var h = 0; h < 3; h++) {
            var hGeo = new THREE.ConeGeometry(0.02, 0.08, 6);
            var hMat = new THREE.MeshBasicMaterial({
                color: hatColors[h], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hMesh = new THREE.Mesh(hGeo, hMat);
            hMesh.visible = false;
            scene.add(hMesh);
            this._hatCones.push({
                mesh: hMesh,
                offsetAngle: (h / 3) * Math.PI * 2 - Math.PI / 2,
                tipBob: Math.random() * Math.PI * 2
            });
        }

        // Jester hat bells (small spheres at tips)
        this._bells = [];
        var bellGeo = new THREE.SphereGeometry(0.012, 6, 6);
        for (var b = 0; b < 3; b++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xffff88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bMesh = new THREE.Mesh(bellGeo, bMat);
            bMesh.visible = false;
            scene.add(bMesh);
            this._bells.push({ mesh: bMesh });
        }

        // Pie disc (thrown projectile)
        var pieGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.015, 12);
        var pieMat = new THREE.MeshBasicMaterial({
            color: 0xffeecc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._pie = new THREE.Mesh(pieGeo, pieMat);
        this._pie.visible = false;
        this._pie.rotation.x = Math.PI / 2;
        scene.add(this._pie);

        // Splat particles
        this._splats = [];
        var splatGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffeecc : 0xffffdd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(splatGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._splats.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._splatIdx = 0;

        // Banana peel (flat yellow shape)
        var bananGeo = new THREE.BoxGeometry(0.04, 0.015, 0.03);
        var bananMat = new THREE.MeshBasicMaterial({
            color: 0xffdd22, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._banana = new THREE.Mesh(bananGeo, bananMat);
        this._banana.visible = false;
        scene.add(this._banana);

        // Laugh particle rings
        this._laughs = [];
        var laughGeo = new THREE.TorusGeometry(0.04, 0.006, 4, 12);
        for (var l = 0; l < 8; l++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: l % 2 === 0 ? 0xffaa44 : 0xff6644, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lMesh = new THREE.Mesh(laughGeo, lMat);
            lMesh.visible = false;
            scene.add(lMesh);
            this._laughs.push({
                mesh: lMesh, life: 0, maxLife: 0,
                growRate: 0
            });
        }
        this._laughIdx = 0;

        // Jester glow (gold/red/green)
        var jGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var jMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._jesterGlow = new THREE.Mesh(jGeo, jMat);
        this._jesterGlow.position.set(ox, oy, 0);
        scene.add(this._jesterGlow);

        this._pieThrown = false;
        this._slipped = false;
    },
    _burstSplat(x, y) {
        for (var i = 0; i < 8; i++) {
            var s = this._splats[this._splatIdx % this._splats.length];
            this._splatIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1 + Math.random() * 2;
            s.vx = Math.cos(angle) * spd;
            s.vy = Math.sin(angle) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.life = 0.4 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    _emitLaugh(x, y) {
        var l = this._laughs[this._laughIdx % this._laughs.length];
        this._laughIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(x, y, 0);
        l.mesh.scale.setScalar(1);
        l.life = 0.6 + Math.random() * 0.3;
        l.maxLife = l.life;
        l.growRate = 3 + Math.random() * 3;
        l.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;

        // Update hat position relative to model
        var hatBaseX = model.position.x;
        var hatBaseY = model.position.y + 0.12;

        if (progress < 0.08) {
            // Phase 1: Jester hat appears
            var t = progress / 0.08;
            for (var h = 0; h < 3; h++) {
                var cone = this._hatCones[h];
                cone.mesh.visible = true;
                cone.mesh.material.opacity = t * 0.6;
                var cAngle = cone.offsetAngle;
                cone.mesh.position.set(
                    hatBaseX + Math.cos(cAngle) * 0.04,
                    hatBaseY + 0.03,
                    Math.sin(cAngle) * 0.02
                );
                cone.mesh.rotation.z = cAngle * 0.3;
                this._bells[h].mesh.visible = true;
                this._bells[h].mesh.material.opacity = t * 0.7;
                this._bells[h].mesh.position.set(
                    cone.mesh.position.x + Math.sin(cAngle) * 0.02,
                    cone.mesh.position.y + 0.04,
                    cone.mesh.position.z
                );
            }
            this._jesterGlow.material.opacity = t * 0.05;
        } else if (progress < 0.28) {
            // Phase 2: Pratfall - drop and bounce
            var t2 = (progress - 0.08) / 0.20;

            if (t2 < 0.3) {
                // Standing, about to trip
                model.rotation.z = t2 * 0.15;
            } else if (t2 < 0.5) {
                // Falling
                var fallT = (t2 - 0.3) / 0.2;
                model.position.set(ox + fallT * 0.1, oy - fallT * 0.08, orig.z);
                model.rotation.z = 0.15 + fallT * 0.3;
                model.scale.set(gs * (1 + fallT * 0.1), gs * (1 - fallT * 0.15), gs);
            } else if (t2 < 0.7) {
                // Impact bounce
                var bounceT = (t2 - 0.5) / 0.2;
                var bounce = Math.abs(Math.sin(bounceT * Math.PI * 2)) * 0.06 * (1 - bounceT);
                model.position.set(ox + 0.1, oy - 0.08 + bounce, orig.z);
                model.rotation.z = 0.45 * (1 - bounceT);
                model.scale.set(
                    gs * (1.1 - bounceT * 0.1),
                    gs * (0.85 + bounceT * 0.15),
                    gs
                );
            } else {
                // Get back up
                var upT = (t2 - 0.7) / 0.3;
                model.position.set(ox + 0.1 * (1 - upT), oy - 0.08 * (1 - upT), orig.z);
                model.rotation.z = 0;
                model.scale.setScalar(gs);
            }

            // Laugh after fall
            if (t2 > 0.6 && t2 < 0.8) {
                this._emitLaugh(model.position.x, model.position.y + 0.1);
            }

            // Hat follows model
            hatBaseX = model.position.x;
            hatBaseY = model.position.y + 0.12;
            for (var h2 = 0; h2 < 3; h2++) {
                var cone2 = this._hatCones[h2];
                cone2.mesh.material.opacity = 0.6;
                var ca2 = cone2.offsetAngle;
                cone2.mesh.position.set(
                    hatBaseX + Math.cos(ca2) * 0.04,
                    hatBaseY + 0.03 + Math.sin(time * 4 + cone2.tipBob) * 0.01,
                    Math.sin(ca2) * 0.02
                );
                this._bells[h2].mesh.position.set(
                    cone2.mesh.position.x + Math.sin(ca2) * 0.02,
                    cone2.mesh.position.y + 0.04,
                    cone2.mesh.position.z
                );
            }

            this._jesterGlow.material.opacity = 0.05 + t2 * 0.03;
        } else if (progress < 0.50) {
            // Phase 3: Pie throw
            var t3 = (progress - 0.28) / 0.22;

            if (t3 < 0.2) {
                // Wind up
                model.rotation.z = -t3 * 0.4;
                model.position.set(ox - t3 * 0.05, oy, orig.z);
            } else if (t3 < 0.4) {
                // Throw
                var throwT = (t3 - 0.2) / 0.2;
                model.rotation.z = -0.08 + throwT * 0.2;
                model.position.set(ox, oy, orig.z);

                this._pie.visible = true;
                this._pie.material.opacity = 0.7;
                var pieX = ox + 0.1 + throwT * 0.5;
                var pieY = oy + 0.05 + Math.sin(throwT * Math.PI) * 0.1;
                this._pie.position.set(pieX, pieY, 0);
                this._pie.rotation.z = throwT * Math.PI * 3;
            } else if (t3 < 0.55) {
                // Splat!
                var splatT = (t3 - 0.4) / 0.15;
                if (!this._pieThrown) {
                    this._pieThrown = true;
                    this._burstSplat(ox + 0.6, oy + 0.05);
                }
                this._pie.visible = false;
                model.rotation.z = 0.12 * (1 - splatT);
                model.position.set(ox, oy, orig.z);
            } else {
                // Laugh rings
                model.position.set(ox, oy, orig.z);
                model.rotation.z = 0;
                if (t3 < 0.7) {
                    this._emitLaugh(ox + 0.6, oy + 0.05);
                }
            }

            // Hat
            hatBaseX = model.position.x;
            hatBaseY = model.position.y + 0.12;
            for (var h3 = 0; h3 < 3; h3++) {
                var cone3 = this._hatCones[h3];
                var ca3 = cone3.offsetAngle;
                cone3.mesh.position.set(
                    hatBaseX + Math.cos(ca3) * 0.04,
                    hatBaseY + 0.03 + Math.sin(time * 4 + cone3.tipBob) * 0.01,
                    Math.sin(ca3) * 0.02
                );
                this._bells[h3].mesh.position.set(
                    cone3.mesh.position.x + Math.sin(ca3) * 0.02,
                    cone3.mesh.position.y + 0.04,
                    cone3.mesh.position.z
                );
            }

            this._jesterGlow.material.opacity = 0.08;
        } else if (progress < 0.75) {
            // Phase 4: Banana peel slip
            var t4 = (progress - 0.50) / 0.25;

            // Banana peel on ground
            this._banana.visible = true;
            this._banana.material.opacity = 0.6;
            this._banana.position.set(ox + 0.15, oy - 0.12, 0);

            if (t4 < 0.3) {
                // Walking toward banana
                model.position.set(ox + t4 * 0.5, oy, orig.z);
                model.rotation.z = Math.sin(time * 6) * 0.02;
            } else if (t4 < 0.5) {
                // Hit banana - slide!
                var slideT = (t4 - 0.3) / 0.2;
                if (!this._slipped) {
                    this._slipped = true;
                }
                model.position.set(
                    ox + 0.15 + slideT * 0.25,
                    oy - slideT * 0.05,
                    orig.z
                );
                model.rotation.z = slideT * 0.5;
                model.scale.set(gs * (1 + slideT * 0.15), gs * (1 - slideT * 0.1), gs);
            } else if (t4 < 0.7) {
                // Spinning on ground
                var spinT = (t4 - 0.5) / 0.2;
                model.position.set(ox + 0.4, oy - 0.05, orig.z);
                model.rotation.z = 0.5 + spinT * Math.PI * 2;
                var bounce2 = Math.abs(Math.sin(spinT * Math.PI * 3)) * 0.04;
                model.position.y = oy - 0.05 + bounce2;
                model.scale.setScalar(gs);
            } else {
                // Recovery
                var recoverT = (t4 - 0.7) / 0.3;
                model.position.set(
                    ox + 0.4 * (1 - recoverT),
                    oy - 0.05 * (1 - recoverT),
                    orig.z
                );
                model.rotation.z = (0.5 + Math.PI * 2) * (1 - recoverT);
                model.scale.setScalar(gs);

                // Laugh rings
                if (recoverT < 0.5) {
                    this._emitLaugh(model.position.x, model.position.y + 0.1);
                }
            }

            // Hat follows
            hatBaseX = model.position.x;
            hatBaseY = model.position.y + 0.12;
            for (var h4 = 0; h4 < 3; h4++) {
                var cone4 = this._hatCones[h4];
                var ca4 = cone4.offsetAngle;
                cone4.mesh.position.set(
                    hatBaseX + Math.cos(ca4 + model.rotation.z * 0.3) * 0.04,
                    hatBaseY + 0.03 + Math.sin(time * 5 + cone4.tipBob) * 0.015,
                    Math.sin(ca4) * 0.02
                );
                this._bells[h4].mesh.position.set(
                    cone4.mesh.position.x,
                    cone4.mesh.position.y + 0.04,
                    cone4.mesh.position.z
                );
            }

            this._jesterGlow.material.opacity = 0.08 + t4 * 0.02;
        } else if (progress < 0.90) {
            // Phase 5: Final bow with jingling hat
            var t5 = (progress - 0.75) / 0.15;
            this._banana.material.opacity = 0.6 * (1 - t5);

            model.position.set(ox, oy, orig.z);
            model.rotation.z = -t5 * 0.08;
            model.scale.setScalar(gs);

            // Hat jingles
            for (var h5 = 0; h5 < 3; h5++) {
                var cone5 = this._hatCones[h5];
                var ca5 = cone5.offsetAngle;
                var jingle = Math.sin(time * 10 + h5 * 2) * 0.015;
                cone5.mesh.position.set(
                    ox + Math.cos(ca5) * 0.04,
                    oy + 0.15 + jingle,
                    Math.sin(ca5) * 0.02
                );
                cone5.mesh.material.opacity = 0.6 * (1 - t5);
                this._bells[h5].mesh.position.set(
                    cone5.mesh.position.x,
                    cone5.mesh.position.y + 0.04,
                    cone5.mesh.position.z
                );
                this._bells[h5].mesh.material.opacity = 0.7 * (1 - t5);
            }

            this._jesterGlow.material.opacity = 0.1 * (1 - t5);
        } else {
            // Phase 6: Settle
            var t6 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var h6 = 0; h6 < 3; h6++) {
                this._hatCones[h6].mesh.visible = false;
                this._bells[h6].mesh.visible = false;
            }
            this._banana.visible = false;
            this._jesterGlow.material.opacity = 0;
        }

        // Update splat particles
        for (var si = 0; si < this._splats.length; si++) {
            var sp = this._splats[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 2.5 * delta;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.7;
        }

        // Update laugh rings
        for (var li = 0; li < this._laughs.length; li++) {
            var laugh = this._laughs[li];
            if (laugh.life <= 0) continue;
            laugh.life -= delta;
            if (laugh.life <= 0) { laugh.mesh.visible = false; continue; }
            var lr = laugh.life / laugh.maxLife;
            laugh.mesh.material.opacity = lr * 0.5;
            laugh.mesh.scale.setScalar(1 + (1 - lr) * laugh.growRate);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._hatCones) { this._hatCones.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._bells) { this._bells.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._pie) { scene.remove(this._pie); this._pie.geometry.dispose(); this._pie.material.dispose(); }
        if (this._splats) { this._splats.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._banana) { scene.remove(this._banana); this._banana.geometry.dispose(); this._banana.material.dispose(); }
        if (this._laughs) { this._laughs.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._jesterGlow) { scene.remove(this._jesterGlow); this._jesterGlow.geometry.dispose(); this._jesterGlow.material.dispose(); }
        this._hatCones = this._bells = this._pie = this._splats = this._banana = this._laughs = this._jesterGlow = null;
    }
};
