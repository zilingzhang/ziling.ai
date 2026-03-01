export default {
    name: 'Symbioting',
    label: 'symbioting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Partner organism (sphere)
        var partnerGeo = new THREE.SphereGeometry(0.1, 12, 12);
        var partnerMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._partner = new THREE.Mesh(partnerGeo, partnerMat);
        this._partner.position.set(ox + 0.6, oy + 0.2, 0);
        scene.add(this._partner);

        // Tentacle connection lines
        this._tentacles = [];
        for (var i = 0; i < 5; i++) {
            var tPts = [];
            for (var seg = 0; seg < 8; seg++) {
                tPts.push(new THREE.Vector3(0, 0, 0));
            }
            var tGeo = new THREE.BufferGeometry().setFromPoints(tPts);
            var tMat = new THREE.LineBasicMaterial({
                color: i % 2 === 0 ? 0x66dd88 : 0xaa66dd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var tent = new THREE.Line(tGeo, tMat);
            tent.visible = false;
            scene.add(tent);
            this._tentacles.push({ line: tent, phase: i * 1.2 });
        }

        // Mutual benefit particles (green from each)
        this._benefitParts = [];
        var bGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var j = 0; j < 30; j++) {
            var bColors = [0x44ff66, 0x66ffaa, 0x88ffcc, 0xaaffdd, 0x33dd55];
            var bMat = new THREE.MeshBasicMaterial({
                color: bColors[j % bColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bp = new THREE.Mesh(bGeo, bMat);
            bp.visible = false;
            scene.add(bp);
            this._benefitParts.push({
                mesh: bp, life: 0, maxLife: 0,
                fromX: 0, fromY: 0, toX: 0, toY: 0,
                travelProgress: 0, speed: 0
            });
        }
        this._bpIdx = 0;

        // Combined aura
        var auraGeo = new THREE.SphereGeometry(0.35, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x66aa88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox, oy, -0.02);
        scene.add(this._aura);

        // Model aura
        var mAuraGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var mAuraMat = new THREE.MeshBasicMaterial({
            color: 0x44dd66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._modelAura = new THREE.Mesh(mAuraGeo, mAuraMat);
        scene.add(this._modelAura);

        // Partner aura
        var pAuraGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var pAuraMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._partnerAura = new THREE.Mesh(pAuraGeo, pAuraMat);
        scene.add(this._partnerAura);

        this._lastBenefit = 0;
        this._orbitAngle = 0;
    },
    _emitBenefit(fromX, fromY, toX, toY) {
        for (var i = 0; i < 2; i++) {
            var b = this._benefitParts[this._bpIdx % this._benefitParts.length];
            this._bpIdx++;
            b.mesh.visible = true;
            b.fromX = fromX + (Math.random() - 0.5) * 0.05;
            b.fromY = fromY + (Math.random() - 0.5) * 0.05;
            b.toX = toX + (Math.random() - 0.5) * 0.05;
            b.toY = toY + (Math.random() - 0.5) * 0.05;
            b.mesh.position.set(b.fromX, b.fromY, 0.01);
            b.travelProgress = 0;
            b.speed = 0.8 + Math.random() * 0.5;
            b.life = 1.5;
            b.maxLife = 1.5;
            b.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;

        if (progress < 0.10) {
            // Phase 1: Model and partner appear apart
            var t = progress / 0.10;
            this._partner.material.opacity = t * 0.6;
            this._modelAura.material.opacity = t * 0.1;
            this._partnerAura.material.opacity = t * 0.1;

            model.position.set(ox - 0.4, oy, orig.z);
            this._partner.position.set(ox + 0.5, oy + 0.15, 0);
            this._modelAura.position.set(ox - 0.4, oy, 0);
            this._partnerAura.position.copy(this._partner.position);
        } else if (progress < 0.35) {
            // Phase 2: Orbit closer together
            var t2 = (progress - 0.10) / 0.25;
            this._orbitAngle += delta * 2.0;

            var orbitRadius = 0.45 - t2 * 0.25;
            var centerX = ox;
            var centerY = oy + 0.05;

            var mx = centerX + Math.cos(this._orbitAngle) * orbitRadius;
            var my = centerY + Math.sin(this._orbitAngle) * orbitRadius * 0.5;
            var px = centerX - Math.cos(this._orbitAngle) * orbitRadius * 0.8;
            var py = centerY - Math.sin(this._orbitAngle) * orbitRadius * 0.5 * 0.8;

            model.position.set(mx, my, orig.z);
            this._partner.position.set(px, py, 0);
            this._partner.material.opacity = 0.6;

            this._modelAura.position.copy(model.position);
            this._partnerAura.position.copy(this._partner.position);
            this._modelAura.material.opacity = 0.1 + t2 * 0.05;
            this._partnerAura.material.opacity = 0.1 + t2 * 0.05;
        } else if (progress < 0.60) {
            // Phase 3: Tentacle connections form, benefit exchange
            var t3 = (progress - 0.35) / 0.25;
            this._orbitAngle += delta * 1.5;

            var orbitR2 = 0.2;
            var cx = ox;
            var cy = oy + 0.05;

            var mx2 = cx + Math.cos(this._orbitAngle) * orbitR2;
            var my2 = cy + Math.sin(this._orbitAngle) * orbitR2 * 0.5;
            var px2 = cx - Math.cos(this._orbitAngle) * orbitR2 * 0.8;
            var py2 = cy - Math.sin(this._orbitAngle) * orbitR2 * 0.5 * 0.8;

            model.position.set(mx2, my2, orig.z);
            this._partner.position.set(px2, py2, 0);

            // Tentacles connect them
            for (var ti = 0; ti < this._tentacles.length; ti++) {
                var tent = this._tentacles[ti];
                var tentT = Math.min(1, t3 * 3 - ti * 0.3);
                if (tentT > 0) {
                    tent.line.visible = true;
                    tent.line.material.opacity = tentT * 0.4;

                    var positions = tent.line.geometry.attributes.position;
                    for (var seg = 0; seg < 8; seg++) {
                        var segT = seg / 7;
                        var sx = mx2 + (px2 - mx2) * segT * tentT;
                        var sy = my2 + (py2 - my2) * segT * tentT;
                        // Wavy tentacle
                        sy += Math.sin(time * 3 + tent.phase + segT * Math.PI * 2) * 0.03 * Math.sin(segT * Math.PI);
                        sx += Math.cos(time * 2 + tent.phase + segT * Math.PI) * 0.02 * Math.sin(segT * Math.PI);
                        positions.setXYZ(seg, sx, sy, 0.01);
                    }
                    positions.needsUpdate = true;
                }
            }

            // Emit benefit particles between them
            if (time - this._lastBenefit > 0.2) {
                this._emitBenefit(mx2, my2, px2, py2);
                this._emitBenefit(px2, py2, mx2, my2);
                this._lastBenefit = time;
            }

            this._modelAura.position.copy(model.position);
            this._partnerAura.position.copy(this._partner.position);
            this._modelAura.material.opacity = 0.15 + Math.sin(time * 3) * 0.05;
            this._partnerAura.material.opacity = 0.15 + Math.sin(time * 3 + 1) * 0.05;
        } else if (progress < 0.82) {
            // Phase 4: Merged form, combined aura, both glow brighter
            var t4 = (progress - 0.60) / 0.22;
            this._orbitAngle += delta * 1.0;

            var mergeR = 0.2 - t4 * 0.1;
            var mcx = ox;
            var mcy = oy + 0.05;

            var mx3 = mcx + Math.cos(this._orbitAngle) * mergeR;
            var my3 = mcy + Math.sin(this._orbitAngle) * mergeR * 0.5;
            var px3 = mcx - Math.cos(this._orbitAngle) * mergeR * 0.8;
            var py3 = mcy - Math.sin(this._orbitAngle) * mergeR * 0.5 * 0.8;

            model.position.set(mx3, my3, orig.z);
            this._partner.position.set(px3, py3, 0);

            // Update tentacles
            for (var tj = 0; tj < this._tentacles.length; tj++) {
                var tent2 = this._tentacles[tj];
                tent2.line.visible = true;
                tent2.line.material.opacity = 0.4;
                var pos2 = tent2.line.geometry.attributes.position;
                for (var sg2 = 0; sg2 < 8; sg2++) {
                    var sgT2 = sg2 / 7;
                    var sx2 = mx3 + (px3 - mx3) * sgT2;
                    var sy2 = my3 + (py3 - my3) * sgT2;
                    sy2 += Math.sin(time * 3 + tent2.phase + sgT2 * Math.PI * 2) * 0.02 * Math.sin(sgT2 * Math.PI);
                    pos2.setXYZ(sg2, sx2, sy2, 0.01);
                }
                pos2.needsUpdate = true;
            }

            // Combined aura grows
            this._aura.position.set(mcx, mcy, -0.02);
            this._aura.material.opacity = t4 * 0.15;
            this._aura.scale.setScalar(1 + Math.sin(time * 2) * 0.1);

            // Individual auras get brighter
            this._modelAura.position.copy(model.position);
            this._partnerAura.position.copy(this._partner.position);
            this._modelAura.material.opacity = 0.15 + t4 * 0.15 + Math.sin(time * 3) * 0.05;
            this._partnerAura.material.opacity = 0.15 + t4 * 0.15 + Math.sin(time * 3 + 1) * 0.05;
            this._partner.material.opacity = 0.6 + t4 * 0.2;

            // Continue benefit exchange
            if (time - this._lastBenefit > 0.15) {
                this._emitBenefit(mx3, my3, px3, py3);
                this._emitBenefit(px3, py3, mx3, my3);
                this._lastBenefit = time;
            }
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.82) / 0.18;

            this._partner.material.opacity = 0.8 * (1 - t5);
            this._aura.material.opacity = 0.15 * (1 - t5);
            this._modelAura.material.opacity = 0.3 * (1 - t5);
            this._partnerAura.material.opacity = 0.3 * (1 - t5);

            for (var tk = 0; tk < this._tentacles.length; tk++) {
                this._tentacles[tk].line.material.opacity = 0.4 * (1 - t5);
            }

            model.position.set(ox, oy, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update benefit particles (travel along path)
        for (var bi = 0; bi < this._benefitParts.length; bi++) {
            var bp = this._benefitParts[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }

            bp.travelProgress = Math.min(1, bp.travelProgress + bp.speed * delta);
            var tt = bp.travelProgress;
            // Curved path
            var midX = (bp.fromX + bp.toX) / 2;
            var midY = (bp.fromY + bp.toY) / 2 + 0.08;
            var bx = (1 - tt) * (1 - tt) * bp.fromX + 2 * (1 - tt) * tt * midX + tt * tt * bp.toX;
            var by = (1 - tt) * (1 - tt) * bp.fromY + 2 * (1 - tt) * tt * midY + tt * tt * bp.toY;
            bp.mesh.position.set(bx, by, 0.01);
            bp.mesh.material.opacity = tt < 0.9 ? 0.8 : 0.8 * (1 - (tt - 0.9) / 0.1);
            bp.mesh.scale.setScalar(0.7 + Math.sin(tt * Math.PI) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._partner) { scene.remove(this._partner); this._partner.geometry.dispose(); this._partner.material.dispose(); }
        if (this._tentacles) {
            this._tentacles.forEach(function(t) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); });
        }
        if (this._benefitParts) {
            this._benefitParts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        if (this._modelAura) { scene.remove(this._modelAura); this._modelAura.geometry.dispose(); this._modelAura.material.dispose(); }
        if (this._partnerAura) { scene.remove(this._partnerAura); this._partnerAura.geometry.dispose(); this._partnerAura.material.dispose(); }
        this._partner = this._tentacles = this._benefitParts = this._aura = this._modelAura = this._partnerAura = null;
    }
};
