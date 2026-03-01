export default {
    name: 'Fiddle-Faddling',
    label: 'fiddle-faddling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Objects to fiddle with
        this._objects = [];
        var objDefs = [
            { geo: new THREE.SphereGeometry(0.035, 8, 8), color: 0xff6644 },
            { geo: new THREE.BoxGeometry(0.05, 0.05, 0.05), color: 0x4488ff },
            { geo: new THREE.ConeGeometry(0.03, 0.06, 6), color: 0x44ff88 },
            { geo: new THREE.SphereGeometry(0.025, 6, 6), color: 0xffaa44 },
            { geo: new THREE.BoxGeometry(0.04, 0.04, 0.04), color: 0xaa44ff }
        ];
        var basePositions = [
            { x: ox + 0.25, y: oy - 0.1 },
            { x: ox + 0.35, y: oy - 0.05 },
            { x: ox + 0.3, y: oy + 0.05 },
            { x: ox + 0.2, y: oy + 0.1 },
            { x: ox + 0.4, y: oy }
        ];
        for (var i = 0; i < 5; i++) {
            var mat = new THREE.MeshBasicMaterial({
                color: objDefs[i].color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mesh = new THREE.Mesh(objDefs[i].geo, mat);
            mesh.position.set(basePositions[i].x, basePositions[i].y, 0);
            mesh.visible = false;
            scene.add(mesh);
            this._objects.push({
                mesh: mesh,
                baseX: basePositions[i].x,
                baseY: basePositions[i].y,
                heldBy: false,
                returning: false
            });
        }

        // Held object indicator (glow around currently held)
        var holdGeo = new THREE.SphereGeometry(0.05, 8, 8);
        var holdMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._holdGlow = new THREE.Mesh(holdGeo, holdMat);
        this._holdGlow.visible = false;
        scene.add(this._holdGlow);

        // Nervous energy sparks
        this._sparks = [];
        var spkGeo = new THREE.OctahedronGeometry(0.008, 0);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(spkGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._sparks.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;
        this._lastSpk = 0;

        // Frustration cloud (appears at end)
        var frustGeo = new THREE.SphereGeometry(0.15, 8, 8);
        var frustMat = new THREE.MeshBasicMaterial({
            color: 0xffaaaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._frustCloud = new THREE.Mesh(frustGeo, frustMat);
        this._frustCloud.position.set(ox, oy + 0.15, 0);
        scene.add(this._frustCloud);

        // Futility glow
        var futGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var futMat = new THREE.MeshBasicMaterial({
            color: 0xddcc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._futilityGlow = new THREE.Mesh(futGeo, futMat);
        this._futilityGlow.position.set(ox, oy, 0);
        scene.add(this._futilityGlow);

        this._currentObj = 0;
        this._handX = ox + 0.15;
        this._handY = oy;
    },
    _emitSpark(x, y) {
        var s = this._sparks[this._spkIdx % this._sparks.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.vx = (Math.random() - 0.5) * 1.5;
        s.vy = 0.5 + Math.random() * 1.0;
        s.life = 0.2 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Fiddle cycle: pick up, examine, put down, repeat with different object
        var fiddleCycles = 5;
        var cycleLen = 0.15;
        var totalFiddleLen = fiddleCycles * cycleLen;

        if (progress < 0.05) {
            // Phase 1: Objects appear
            var t = progress / 0.05;
            for (var i = 0; i < this._objects.length; i++) {
                var obj = this._objects[i];
                obj.mesh.visible = true;
                obj.mesh.material.opacity = t * 0.6;
            }
            model.rotation.z = Math.sin(time * 4) * 0.02;
            this._futilityGlow.material.opacity = t * 0.04;
        } else if (progress < 0.05 + totalFiddleLen) {
            // Phase 2: Fiddle cycles
            var fiddleProgress = (progress - 0.05) / totalFiddleLen;
            var cycleIdx = Math.min(fiddleCycles - 1, Math.floor(fiddleProgress * fiddleCycles));
            var localT = (fiddleProgress * fiddleCycles) - cycleIdx;
            var objIdx = cycleIdx % this._objects.length;
            var obj2 = this._objects[objIdx];

            if (localT < 0.25) {
                // Reach toward object
                var reach = localT / 0.25;
                var ease = reach * reach * (3 - 2 * reach);
                this._handX = ox + 0.15 + (obj2.baseX - ox - 0.15) * ease;
                this._handY = oy + (obj2.baseY - oy) * ease;
                model.position.set(ox + ease * 0.05, oy, oz);
                model.rotation.z = Math.atan2(obj2.baseY - oy, obj2.baseX - ox) * ease * 0.05;
            } else if (localT < 0.50) {
                // Pick up and examine (lift object)
                var examT = (localT - 0.25) / 0.25;
                var liftY = obj2.baseY + examT * 0.1;
                obj2.mesh.position.set(obj2.baseX, liftY, 0);
                obj2.mesh.rotation.z = Math.sin(time * 5) * 0.3;
                obj2.mesh.rotation.x = Math.cos(time * 4) * 0.2;

                this._holdGlow.visible = true;
                this._holdGlow.position.copy(obj2.mesh.position);
                this._holdGlow.material.opacity = 0.3;
                this._holdGlow.scale.setScalar(1 + Math.sin(time * 6) * 0.2);

                model.rotation.z = Math.sin(time * 3) * 0.04;

                // Nervous sparks
                if (time - this._lastSpk > 0.08) {
                    this._emitSpark(this._handX, this._handY);
                    this._lastSpk = time;
                }
            } else if (localT < 0.75) {
                // Put down (wrong position)
                var putT = (localT - 0.50) / 0.25;
                var wrongX = obj2.baseX + (Math.random() - 0.5) * 0.05;
                var wrongY = obj2.baseY - putT * 0.1 + (Math.random() - 0.5) * 0.02;
                obj2.mesh.position.set(
                    obj2.baseX + Math.sin(cycleIdx * 2.1) * 0.05,
                    obj2.baseY + putT * -0.05,
                    0
                );
                obj2.mesh.rotation.z = Math.sin(cycleIdx * 1.3) * 0.3;

                this._holdGlow.visible = false;
                model.rotation.z = -Math.sin(time * 2) * 0.03;
            } else {
                // Pause, look dissatisfied
                obj2.mesh.position.set(
                    obj2.baseX + Math.sin(cycleIdx * 2.1) * 0.05,
                    obj2.baseY,
                    0
                );
                model.position.set(ox, oy, oz);
                model.rotation.z = -0.03 + Math.sin(time * 2) * 0.02;
                this._holdGlow.visible = false;
            }

            // All objects visible
            for (var j = 0; j < this._objects.length; j++) {
                this._objects[j].mesh.material.opacity = 0.6;
            }
            this._futilityGlow.material.opacity = 0.05 + fiddleProgress * 0.05;
        } else if (progress < 0.82) {
            // Phase 3: Takes apart and rebuilds wrong
            var t3 = (progress - 0.05 - totalFiddleLen) / (0.82 - 0.05 - totalFiddleLen);

            // Objects rearrange chaotically
            for (var k = 0; k < this._objects.length; k++) {
                var o = this._objects[k];
                var chaos = Math.sin(time * 3 + k * 1.7) * 0.1;
                var chaos2 = Math.cos(time * 2.5 + k * 1.3) * 0.08;
                o.mesh.position.set(
                    o.baseX + chaos + (k % 2 === 0 ? t3 * 0.1 : -t3 * 0.08),
                    o.baseY + chaos2,
                    0
                );
                o.mesh.rotation.z = time * 2 + k;
                o.mesh.rotation.x = Math.sin(time * 3 + k) * 0.5;
            }

            model.rotation.z = Math.sin(time * 4) * 0.06;
            model.position.set(ox + Math.sin(time * 3) * 0.02, oy, oz);

            // More sparks
            if (time - this._lastSpk > 0.06) {
                this._emitSpark(ox + 0.3, oy);
                this._lastSpk = time;
            }

            this._futilityGlow.material.opacity = 0.08 + t3 * 0.05;

            // Frustration builds
            this._frustCloud.material.opacity = t3 * 0.15;
            this._frustCloud.scale.setScalar(1 + t3 * 0.5);
        } else if (progress < 0.92) {
            // Phase 4: Gives up - hands thrown up, objects scatter slightly
            var t4 = (progress - 0.82) / 0.10;

            model.position.set(ox, oy + Math.sin(t4 * Math.PI) * 0.03, oz);
            model.rotation.z = -t4 * 0.06;
            model.scale.set(gs * (1 + Math.sin(t4 * Math.PI) * 0.03), gs, gs);

            for (var m = 0; m < this._objects.length; m++) {
                var obj3 = this._objects[m];
                obj3.mesh.material.opacity = 0.6 * (1 - t4 * 0.5);
            }

            this._frustCloud.material.opacity = 0.15 * (1 - t4);
            this._futilityGlow.material.opacity = 0.13 * (1 - t4);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.92) / 0.08;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var n = 0; n < this._objects.length; n++) {
                this._objects[n].mesh.material.opacity = 0.3 * (1 - t5);
            }
            this._frustCloud.material.opacity = 0;
            this._futilityGlow.material.opacity = 0;
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 2.0 * delta;
            sp.mesh.rotation.z = time * 8;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.6;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._objects) { this._objects.forEach(function(o) { scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }); }
        if (this._holdGlow) { scene.remove(this._holdGlow); this._holdGlow.geometry.dispose(); this._holdGlow.material.dispose(); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._frustCloud) { scene.remove(this._frustCloud); this._frustCloud.geometry.dispose(); this._frustCloud.material.dispose(); }
        if (this._futilityGlow) { scene.remove(this._futilityGlow); this._futilityGlow.geometry.dispose(); this._futilityGlow.material.dispose(); }
        this._objects = this._holdGlow = this._sparks = this._frustCloud = this._futilityGlow = null;
    }
};
