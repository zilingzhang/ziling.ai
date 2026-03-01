export default {
    name: 'Whatchamacalliting',
    label: 'whatchamacalliting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Morphing wireframe object (starts as box, morphs between shapes)
        // We create all shapes and toggle visibility
        this._shapes = [];
        var shapeDefs = [
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.ConeGeometry(0.06, 0.12, 8),
            new THREE.TorusGeometry(0.06, 0.025, 6, 16)
        ];
        var wireColor = 0xaa66ff;
        for (var i = 0; i < 4; i++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: wireColor, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                wireframe: true
            });
            var wMesh = new THREE.Mesh(shapeDefs[i], wMat);
            wMesh.visible = false;
            wMesh.position.set(ox + 0.35, oy + 0.05, 0);
            scene.add(wMesh);
            this._shapes.push({ mesh: wMesh });
        }
        this._currentShape = 0;
        this._lastMorph = 0;
        this._objectCenter = { x: ox + 0.35, y: oy + 0.05 };

        // Question mark particles orbiting the object
        this._questionParts = [];
        var qGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
        for (var q = 0; q < 10; q++) {
            var qMat = new THREE.MeshBasicMaterial({
                color: 0xddaaff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var qMesh = new THREE.Mesh(qGeo, qMat);
            qMesh.visible = false;
            scene.add(qMesh);
            this._questionParts.push({
                mesh: qMesh,
                angle: (q / 10) * Math.PI * 2,
                radius: 0.15 + q * 0.01,
                bobPhase: Math.random() * Math.PI * 2,
                speed: 1.5 + Math.random() * 1.0
            });
        }

        // Label tags (flat boxes that pop up and disappear)
        this._labels = [];
        var labelTexts = [0xffcc44, 0x44ccff, 0xff88aa, 0x88ffaa, 0xffaa88, 0xaa88ff];
        var labelGeo = new THREE.BoxGeometry(0.08, 0.025, 0.002);
        for (var l = 0; l < 6; l++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: labelTexts[l], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lMesh = new THREE.Mesh(labelGeo, lMat);
            lMesh.visible = false;
            scene.add(lMesh);
            this._labels.push({
                mesh: lMesh,
                life: 0, maxLife: 0,
                targetX: 0, targetY: 0
            });
        }
        this._labelIdx = 0;
        this._lastLabel = 0;

        // Pointing indicator (small cone)
        var ptGeo = new THREE.ConeGeometry(0.012, 0.04, 4);
        var ptMat = new THREE.MeshBasicMaterial({
            color: 0xffddaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._pointer = new THREE.Mesh(ptGeo, ptMat);
        this._pointer.visible = false;
        this._pointer.rotation.z = -Math.PI / 2;
        scene.add(this._pointer);

        // Existential glow
        var exGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var exMat = new THREE.MeshBasicMaterial({
            color: 0x8844cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._existGlow = new THREE.Mesh(exGeo, exMat);
        this._existGlow.position.set(this._objectCenter.x, this._objectCenter.y, 0);
        scene.add(this._existGlow);

        // Mystery sparkles
        this._sparkles = [];
        var spkGeo = new THREE.OctahedronGeometry(0.008, 0);
        for (var s = 0; s < 12; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xddbbff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(spkGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._sparkles.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;
        this._lastSpk = 0;
    },
    _morphShape(time) {
        if (time - this._lastMorph > 1.5) {
            this._shapes[this._currentShape].mesh.visible = false;
            this._currentShape = (this._currentShape + 1) % this._shapes.length;
            this._shapes[this._currentShape].mesh.visible = true;
            this._lastMorph = time;
        }
    },
    _popLabel(x, y) {
        var l = this._labels[this._labelIdx % this._labels.length];
        this._labelIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(x, y + 0.12, 0.02);
        l.life = 0.8 + Math.random() * 0.4;
        l.maxLife = l.life;
        l.mesh.material.opacity = 0.7;
        l.mesh.scale.set(0.5 + Math.random() * 1.0, 1, 1);
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.2 + Math.random() * 0.3;
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var cx = this._objectCenter.x;
        var cy = this._objectCenter.y;

        if (progress < 0.08) {
            // Phase 1: Mysterious object materializes
            var t = progress / 0.08;
            this._shapes[0].mesh.visible = true;
            this._shapes[0].mesh.material.opacity = t * 0.5;
            this._shapes[0].mesh.rotation.y = time * 1.5;
            this._shapes[0].mesh.rotation.x = time * 0.8;

            this._existGlow.material.opacity = t * 0.05;
            this._lastMorph = time;
        } else if (progress < 0.22) {
            // Phase 2: Model notices, points questioningly
            var t2 = (progress - 0.08) / 0.14;

            // Current shape visible and rotating
            var shape = this._shapes[this._currentShape];
            shape.mesh.visible = true;
            shape.mesh.material.opacity = 0.5;
            shape.mesh.rotation.y = time * 1.5;
            shape.mesh.rotation.x = time * 0.8;
            shape.mesh.position.set(cx, cy, 0);

            // Model turns to look
            model.rotation.z = -t2 * 0.05;

            // Pointer appears
            this._pointer.visible = true;
            this._pointer.material.opacity = t2 * 0.6;
            this._pointer.position.set(
                ox + 0.12 + t2 * 0.05,
                oy + 0.03,
                0.02
            );

            // Question particles start
            for (var q = 0; q < this._questionParts.length; q++) {
                var qp = this._questionParts[q];
                qp.mesh.visible = true;
                qp.mesh.material.opacity = t2 * 0.4;
                qp.angle += delta * qp.speed;
                qp.mesh.position.set(
                    cx + Math.cos(qp.angle) * qp.radius,
                    cy + Math.sin(qp.angle) * qp.radius * 0.5 + Math.sin(time * 2 + qp.bobPhase) * 0.01,
                    0
                );
                qp.mesh.rotation.z = time * 3 + q;
            }

            this._existGlow.material.opacity = 0.05 + t2 * 0.03;
        } else if (progress < 0.55) {
            // Phase 3: Object morphs between shapes, labels pop up and disappear
            var t3 = (progress - 0.22) / 0.33;

            // Morph the shape
            this._morphShape(time);
            var currentMesh = this._shapes[this._currentShape].mesh;
            currentMesh.visible = true;
            currentMesh.material.opacity = 0.5 + Math.sin(time * 3) * 0.15;
            currentMesh.rotation.y = time * 2;
            currentMesh.rotation.x = time * 1.2;
            currentMesh.position.set(
                cx + Math.sin(time * 1.5) * 0.02,
                cy + Math.cos(time * 1.2) * 0.02,
                0
            );
            // Scale pulse during morph
            var morphPulse = 1 + Math.sin(time * 4) * 0.1;
            currentMesh.scale.setScalar(morphPulse);

            // Model scratches head, confused
            model.rotation.z = -0.05 + Math.sin(time * 2) * 0.03;
            model.position.set(ox + Math.sin(time * 1.5) * 0.01, oy, oz);

            // Pointer wobbles
            this._pointer.material.opacity = 0.6;
            this._pointer.position.set(
                ox + 0.17 + Math.sin(time * 3) * 0.02,
                oy + 0.03 + Math.cos(time * 2.5) * 0.01,
                0.02
            );
            this._pointer.rotation.z = -Math.PI / 2 + Math.sin(time * 2) * 0.2;

            // Labels pop up and disappear
            if (time - this._lastLabel > 1.0) {
                this._popLabel(cx, cy);
                this._lastLabel = time;
            }

            // Question particles orbit faster
            for (var q2 = 0; q2 < this._questionParts.length; q2++) {
                var qp2 = this._questionParts[q2];
                qp2.mesh.material.opacity = 0.4 + Math.sin(time * 3 + q2) * 0.15;
                qp2.angle += delta * (qp2.speed + t3 * 1.0);
                qp2.mesh.position.set(
                    cx + Math.cos(qp2.angle) * (qp2.radius + Math.sin(time * 2) * 0.02),
                    cy + Math.sin(qp2.angle) * qp2.radius * 0.5 + Math.sin(time * 2 + qp2.bobPhase) * 0.015,
                    0
                );
                qp2.mesh.rotation.z = time * 3 + q2;
            }

            // Sparkles from object
            if (time - this._lastSpk > 0.12) {
                this._emitSparkle(cx, cy);
                this._lastSpk = time;
            }

            this._existGlow.material.opacity = 0.08 + Math.sin(time * 2) * 0.02;
            this._existGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.05);
        } else if (progress < 0.75) {
            // Phase 4: Peak mystery - rapid morphing, question marks everywhere
            var t4 = (progress - 0.55) / 0.20;

            // Rapid morphing
            if (time - this._lastMorph > 0.6) {
                this._shapes[this._currentShape].mesh.visible = false;
                this._currentShape = (this._currentShape + 1) % this._shapes.length;
                this._shapes[this._currentShape].mesh.visible = true;
                this._lastMorph = time;
            }
            var curMesh = this._shapes[this._currentShape].mesh;
            curMesh.material.opacity = 0.6;
            curMesh.rotation.y = time * 3;
            curMesh.rotation.x = time * 2;
            curMesh.position.set(
                cx + Math.sin(time * 2) * 0.03,
                cy + Math.cos(time * 1.5) * 0.03,
                0
            );
            curMesh.scale.setScalar(1 + Math.sin(time * 6) * 0.15);

            // Model very confused
            model.rotation.z = Math.sin(time * 3) * 0.06;
            model.position.set(ox, oy + Math.sin(time * 2) * 0.01, oz);

            // Labels pop rapidly
            if (time - this._lastLabel > 0.5) {
                this._popLabel(cx + (Math.random() - 0.5) * 0.1, cy);
                this._lastLabel = time;
            }

            // Question particles frenzy
            for (var q3 = 0; q3 < this._questionParts.length; q3++) {
                var qp3 = this._questionParts[q3];
                qp3.mesh.material.opacity = 0.5;
                qp3.angle += delta * (qp3.speed + 2);
                var qDist = qp3.radius + Math.sin(time * 3 + q3) * 0.04;
                qp3.mesh.position.set(
                    cx + Math.cos(qp3.angle) * qDist,
                    cy + Math.sin(qp3.angle) * qDist * 0.6,
                    0
                );
                qp3.mesh.scale.setScalar(1 + t4 * 0.3);
            }

            // More sparkles
            if (time - this._lastSpk > 0.06) {
                this._emitSparkle(cx, cy);
                this._lastSpk = time;
            }

            this._existGlow.material.opacity = 0.1 + t4 * 0.05;
        } else if (progress < 0.90) {
            // Phase 5: Acceptance of mystery - everything calms but object remains unknown
            var t5 = (progress - 0.75) / 0.15;

            // Object slows rotation
            var curMesh2 = this._shapes[this._currentShape].mesh;
            curMesh2.material.opacity = 0.5 * (1 - t5);
            curMesh2.rotation.y = time * (3 - t5 * 2);
            curMesh2.scale.setScalar(1);

            model.rotation.z = Math.sin(time * 2) * 0.03 * (1 - t5);
            model.position.set(ox, oy, oz);

            this._pointer.material.opacity = 0.6 * (1 - t5);

            // Questions fade
            for (var q4 = 0; q4 < this._questionParts.length; q4++) {
                this._questionParts[q4].mesh.material.opacity = 0.5 * (1 - t5);
            }

            this._existGlow.material.opacity = 0.15 * (1 - t5);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var s2 = 0; s2 < this._shapes.length; s2++) {
                this._shapes[s2].mesh.visible = false;
            }
            for (var q5 = 0; q5 < this._questionParts.length; q5++) {
                this._questionParts[q5].mesh.visible = false;
            }
            this._pointer.visible = false;
            this._existGlow.material.opacity = 0;
        }

        // Update labels
        for (var li = 0; li < this._labels.length; li++) {
            var lb = this._labels[li];
            if (lb.life <= 0) continue;
            lb.life -= delta;
            if (lb.life <= 0) { lb.mesh.visible = false; continue; }
            var lr = lb.life / lb.maxLife;
            // Pop up then fade
            if (lr > 0.7) {
                lb.mesh.material.opacity = ((1 - lr) / 0.3) * 0.6;
                lb.mesh.position.y += delta * 0.2;
            } else {
                lb.mesh.material.opacity = lr * 0.6;
                lb.mesh.position.y += delta * 0.05;
            }
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.rotation.z = time * 5;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._shapes) { this._shapes.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._questionParts) { this._questionParts.forEach(function(q) { scene.remove(q.mesh); q.mesh.geometry.dispose(); q.mesh.material.dispose(); }); }
        if (this._labels) { this._labels.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._pointer) { scene.remove(this._pointer); this._pointer.geometry.dispose(); this._pointer.material.dispose(); }
        if (this._existGlow) { scene.remove(this._existGlow); this._existGlow.geometry.dispose(); this._existGlow.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._shapes = this._questionParts = this._labels = this._pointer = this._existGlow = this._sparkles = null;
    }
};
