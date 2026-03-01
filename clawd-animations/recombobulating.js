export default {
    name: 'Recombobulating',
    label: 'recombobulating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Scattered personal items
        this._items = [];
        var itemDefs = [
            { geo: new THREE.BoxGeometry(0.07, 0.04, 0.03), color: 0x664422, name: 'shoe' },
            { geo: new THREE.BoxGeometry(0.08, 0.06, 0.05), color: 0x445566, name: 'bag' },
            { geo: new THREE.BoxGeometry(0.06, 0.03, 0.002), color: 0x222222, name: 'phone' },
            { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.025, 8), color: 0x886644, name: 'hat' },
            { geo: new THREE.BoxGeometry(0.05, 0.03, 0.005), color: 0x775533, name: 'wallet' },
            { geo: new THREE.SphereGeometry(0.02, 6, 6), color: 0xccddee, name: 'keys' }
        ];

        // Scattered positions (chaotic)
        var scatterPositions = [
            { x: ox - 0.4, y: oy - 0.2 },
            { x: ox + 0.5, y: oy + 0.15 },
            { x: ox - 0.3, y: oy + 0.2 },
            { x: ox + 0.35, y: oy - 0.15 },
            { x: ox + 0.2, y: oy + 0.25 },
            { x: ox - 0.5, y: oy + 0.05 }
        ];

        // Organized positions (around model)
        var organizedPositions = [
            { x: ox - 0.08, y: oy - 0.12 },
            { x: ox + 0.08, y: oy - 0.08 },
            { x: ox + 0.05, y: oy + 0.02 },
            { x: ox, y: oy + 0.12 },
            { x: ox - 0.06, y: oy - 0.02 },
            { x: ox + 0.03, y: oy + 0.06 }
        ];

        for (var i = 0; i < 6; i++) {
            var mat = new THREE.MeshBasicMaterial({
                color: itemDefs[i].color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mesh = new THREE.Mesh(itemDefs[i].geo, mat);
            mesh.visible = false;
            scene.add(mesh);
            this._items.push({
                mesh: mesh,
                scatterX: scatterPositions[i].x,
                scatterY: scatterPositions[i].y,
                organizedX: organizedPositions[i].x,
                organizedY: organizedPositions[i].y,
                collected: false,
                collectTime: 0,
                scatterRot: (Math.random() - 0.5) * 1.5
            });
        }

        // Collection order
        this._collectOrder = [2, 5, 0, 3, 1, 4];

        // Snap glow particles
        this._snaps = [];
        var snapGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var s = 0; s < 12; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(snapGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._snaps.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._snapIdx = 0;

        // Calm zen glow
        var zenGeo = new THREE.SphereGeometry(0.35, 10, 10);
        var zenMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._zenGlow = new THREE.Mesh(zenGeo, zenMat);
        this._zenGlow.position.set(ox, oy, 0);
        scene.add(this._zenGlow);

        // Order restored ring
        var ringGeo = new THREE.TorusGeometry(0.2, 0.008, 6, 24);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._orderRing = new THREE.Mesh(ringGeo, ringMat);
        this._orderRing.position.set(ox, oy, 0);
        scene.add(this._orderRing);
    },
    _snapBurst(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._snaps[this._snapIdx % this._snaps.length];
            this._snapIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.8 + Math.random() * 1.2;
            s.vx = Math.cos(angle) * spd;
            s.vy = Math.sin(angle) * spd;
            s.life = 0.3 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Items scattered, chaos shown
            var t = progress / 0.08;
            for (var i = 0; i < this._items.length; i++) {
                var item = this._items[i];
                item.mesh.visible = true;
                item.mesh.material.opacity = t * 0.6;
                item.mesh.position.set(item.scatterX, item.scatterY, 0);
                item.mesh.rotation.z = item.scatterRot;
            }
            model.rotation.z = t * 0.05;

            this._zenGlow.material.opacity = 0;
        } else if (progress < 0.20) {
            // Phase 2: Model surveys the chaos, takes a breath
            var t2 = (progress - 0.08) / 0.12;
            model.rotation.z = 0.05 - t2 * 0.05;
            model.position.set(ox, oy + Math.sin(t2 * Math.PI) * 0.01, oz);

            // Items float slightly (chaotic bobbing)
            for (var i2 = 0; i2 < this._items.length; i2++) {
                var item2 = this._items[i2];
                item2.mesh.position.set(
                    item2.scatterX + Math.sin(time * 1.5 + i2) * 0.01,
                    item2.scatterY + Math.cos(time * 1.2 + i2 * 0.8) * 0.01,
                    0
                );
            }

            this._zenGlow.material.opacity = t2 * 0.03;
        } else if (progress < 0.75) {
            // Phase 3: Collecting items one by one
            var collectProgress = (progress - 0.20) / 0.55;
            var itemsToCollect = 6;
            var itemIdx = Math.min(itemsToCollect - 1, Math.floor(collectProgress * itemsToCollect));
            var localT = (collectProgress * itemsToCollect) - itemIdx;

            // Current item being collected
            var currentItemOrder = this._collectOrder[itemIdx];
            var currentItem = this._items[currentItemOrder];

            if (localT < 0.4) {
                // Walk toward item
                var walkT = localT / 0.4;
                var ease = walkT * walkT * (3 - 2 * walkT);
                model.position.set(
                    ox + (currentItem.scatterX - ox) * ease * 0.5,
                    oy + (currentItem.scatterY - oy) * ease * 0.3,
                    oz
                );
                model.rotation.z = Math.atan2(
                    currentItem.scatterY - oy,
                    currentItem.scatterX - ox
                ) * ease * 0.03;
            } else if (localT < 0.7) {
                // Pick up and carry back
                var carryT = (localT - 0.4) / 0.3;
                var ease2 = carryT * carryT * (3 - 2 * carryT);

                if (!currentItem.collected) {
                    currentItem.collected = true;
                    currentItem.collectTime = time;
                }

                // Item moves from scatter to organized position
                currentItem.mesh.position.set(
                    currentItem.scatterX + (currentItem.organizedX - currentItem.scatterX) * ease2,
                    currentItem.scatterY + (currentItem.organizedY - currentItem.scatterY) * ease2,
                    0
                );
                currentItem.mesh.rotation.z = currentItem.scatterRot * (1 - ease2);

                // Model walks back
                model.position.set(
                    ox + (currentItem.scatterX - ox) * 0.5 * (1 - ease2),
                    oy + (currentItem.scatterY - oy) * 0.3 * (1 - ease2),
                    oz
                );
            } else {
                // Item snaps into place
                if (currentItem.collected && currentItem.collectTime > 0 && time - currentItem.collectTime < 0.3) {
                    this._snapBurst(currentItem.organizedX, currentItem.organizedY);
                    currentItem.collectTime = 0;
                }
                currentItem.mesh.position.set(currentItem.organizedX, currentItem.organizedY, 0);
                currentItem.mesh.rotation.z = 0;
                model.position.set(ox, oy, oz);
                model.rotation.z = 0;
            }

            // Already collected items stay organized
            for (var j = 0; j < itemIdx; j++) {
                var prevItem = this._items[this._collectOrder[j]];
                prevItem.mesh.position.set(prevItem.organizedX, prevItem.organizedY, 0);
                prevItem.mesh.rotation.z = 0;
            }

            // Uncollected items still scattered
            for (var k = itemIdx + 1; k < 6; k++) {
                var futureItem = this._items[this._collectOrder[k]];
                futureItem.mesh.position.set(
                    futureItem.scatterX + Math.sin(time * 1.5 + k) * 0.01,
                    futureItem.scatterY + Math.cos(time * 1.2 + k) * 0.01,
                    0
                );
            }

            this._zenGlow.material.opacity = 0.03 + collectProgress * 0.07;
        } else if (progress < 0.88) {
            // Phase 4: Order restored - everything in place, zen glow
            var t4 = (progress - 0.75) / 0.13;

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.setScalar(gs);

            // All items organized and pulsing gently
            for (var m = 0; m < this._items.length; m++) {
                var orgItem = this._items[m];
                orgItem.mesh.position.set(orgItem.organizedX, orgItem.organizedY, 0);
                orgItem.mesh.rotation.z = 0;
                orgItem.mesh.material.opacity = 0.6 + Math.sin(time * 3 + m) * 0.1;
            }

            // Order ring appears
            this._orderRing.material.opacity = t4 * 0.4;
            this._orderRing.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
            this._orderRing.rotation.z = time * 0.5;

            this._zenGlow.material.opacity = 0.1 + t4 * 0.08;
            this._zenGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.05);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var n = 0; n < this._items.length; n++) {
                this._items[n].mesh.material.opacity = 0.6 * (1 - t5);
            }

            this._orderRing.material.opacity = 0.4 * (1 - t5);
            this._zenGlow.material.opacity = 0.18 * (1 - t5);
        }

        // Update snap particles
        for (var si = 0; si < this._snaps.length; si++) {
            var snap = this._snaps[si];
            if (snap.life <= 0) continue;
            snap.life -= delta;
            if (snap.life <= 0) { snap.mesh.visible = false; continue; }
            snap.mesh.position.x += snap.vx * delta;
            snap.mesh.position.y += snap.vy * delta;
            snap.mesh.material.opacity = (snap.life / snap.maxLife) * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._items) { this._items.forEach(function(i) { scene.remove(i.mesh); i.mesh.geometry.dispose(); i.mesh.material.dispose(); }); }
        if (this._snaps) { this._snaps.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._zenGlow) { scene.remove(this._zenGlow); this._zenGlow.geometry.dispose(); this._zenGlow.material.dispose(); }
        if (this._orderRing) { scene.remove(this._orderRing); this._orderRing.geometry.dispose(); this._orderRing.material.dispose(); }
        this._items = this._snaps = this._zenGlow = this._orderRing = null;
    }
};
