export default {
    name: 'Processing',
    label: 'processing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Conveyor belt (two long thin boxes)
        var beltGeo = new THREE.BoxGeometry(1.2, 0.015, 0.1);
        var beltMat = new THREE.MeshBasicMaterial({
            color: 0x3366aa, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._belt = new THREE.Mesh(beltGeo, beltMat);
        this._belt.position.set(ox, oy - 0.25, 0);
        scene.add(this._belt);

        // Belt markings (moving lines)
        this._beltMarks = [];
        var markGeo = new THREE.BoxGeometry(0.005, 0.02, 0.08);
        for (var m = 0; m < 12; m++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: 0x4477bb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mark = new THREE.Mesh(markGeo, mMat);
            mark.position.set(ox - 0.6 + m * 0.1, oy - 0.25, 0.05);
            scene.add(mark);
            this._beltMarks.push(mark);
        }

        // Stage dividers (3 vertical lines)
        this._dividers = [];
        var divGeo = new THREE.BoxGeometry(0.005, 0.3, 0.01);
        for (var d = 0; d < 3; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0x5588cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var div = new THREE.Mesh(divGeo, dMat);
            div.position.set(ox - 0.2 + d * 0.2, oy - 0.15, 0.01);
            scene.add(div);
            this._dividers.push(div);
        }

        // Work items (shapes that move along the belt)
        this._items = [];
        var roughGeo = new THREE.IcosahedronGeometry(0.04, 0);
        var smoothGeo = new THREE.SphereGeometry(0.04, 10, 10);
        for (var i = 0; i < 6; i++) {
            // Each item has a rough and smooth version
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xddaa44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x44aadd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rough = new THREE.Mesh(roughGeo, rMat);
            var smooth = new THREE.Mesh(smoothGeo, sMat);
            rough.visible = false;
            smooth.visible = false;
            scene.add(rough);
            scene.add(smooth);
            this._items.push({
                rough: rough, smooth: smooth,
                x: -0.7 - i * 0.25,
                stage: 0, // 0=raw, 1=clean, 2=transform, 3=validate, 4=done
                active: false,
                spawnDelay: i * 0.12
            });
        }

        // Stage flash effects (check marks for validate stage)
        this._stageFlashes = [];
        var flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
        for (var f = 0; f < 3; f++) {
            var fColors = [0x44ff44, 0x44aaff, 0x44ff44];
            var fMat = new THREE.MeshBasicMaterial({
                color: fColors[f], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var flash = new THREE.Mesh(flashGeo, fMat);
            flash.position.set(ox - 0.2 + f * 0.2, oy - 0.15, 0.02);
            scene.add(flash);
            this._stageFlashes.push(flash);
        }

        // Check mark particles
        this._checks = [];
        var chkGeo = new THREE.BoxGeometry(0.03, 0.008, 0.005);
        for (var c = 0; c < 8; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0x44ff44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var chk = new THREE.Mesh(chkGeo, cMat);
            chk.visible = false;
            scene.add(chk);
            this._checks.push({
                mesh: chk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._chkIdx = 0;

        this._beltSpeed = 0;
    },
    _spawnCheck(x, y) {
        var c = this._checks[this._chkIdx % this._checks.length];
        this._chkIdx++;
        c.mesh.visible = true;
        c.mesh.position.set(x, y + 0.05, 0.03);
        c.vx = (Math.random() - 0.5) * 0.3;
        c.vy = 0.3 + Math.random() * 0.3;
        c.life = 0.4;
        c.maxLife = 0.4;
        c.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Belt speed
        this._beltSpeed = progress > 0.05 && progress < 0.88 ? 0.3 : 0;

        // Animate belt markings
        for (var mi = 0; mi < this._beltMarks.length; mi++) {
            this._beltMarks[mi].position.x += this._beltSpeed * delta;
            if (this._beltMarks[mi].position.x > ox + 0.6) {
                this._beltMarks[mi].position.x -= 1.2;
            }
        }

        if (progress < 0.07) {
            // Phase 1: Belt and structure appear
            var t = progress / 0.07;
            this._belt.material.opacity = t * 0.4;
            for (var i = 0; i < this._beltMarks.length; i++) {
                this._beltMarks[i].material.opacity = t * 0.3;
            }
            for (var j = 0; j < this._dividers.length; j++) {
                this._dividers[j].material.opacity = t * 0.3;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.82) {
            // Phase 2: Items move through pipeline stages
            var t2 = (progress - 0.07) / 0.75;
            this._belt.material.opacity = 0.4;

            for (var k = 0; k < this._items.length; k++) {
                var item = this._items[k];
                if (t2 < item.spawnDelay) continue;

                var itemProg = (t2 - item.spawnDelay) / (1 - item.spawnDelay);
                item.active = true;

                // Move along belt
                item.x = -0.6 + itemProg * 1.3;
                var worldX = ox + item.x;
                var worldY = oy - 0.2;

                // Determine stage based on position
                if (item.x < -0.2) {
                    item.stage = 0; // Raw input
                } else if (item.x < 0.0) {
                    item.stage = 1; // Stage 1: clean
                } else if (item.x < 0.2) {
                    item.stage = 2; // Stage 2: transform
                } else if (item.x < 0.4) {
                    item.stage = 3; // Stage 3: validate
                } else {
                    item.stage = 4; // Output
                }

                if (item.stage <= 1) {
                    // Show rough shape
                    item.rough.visible = true;
                    item.smooth.visible = false;
                    item.rough.position.set(worldX, worldY, 0.03);
                    item.rough.rotation.y = time * 2 + k;
                    item.rough.rotation.x = time * 1.5 + k;

                    // Stage 1: smoothing - scale transition
                    if (item.stage === 1) {
                        var smoothT = (item.x + 0.2) / 0.2;
                        item.rough.material.opacity = 0.6 * (1 - smoothT);
                        item.smooth.visible = smoothT > 0.3;
                        item.smooth.material.opacity = smoothT * 0.6;
                        item.smooth.position.set(worldX, worldY, 0.03);
                        item.smooth.material.color.setHex(0xddaa44);
                    } else {
                        item.rough.material.opacity = 0.6;
                    }
                } else {
                    // Show smooth shape
                    item.rough.visible = false;
                    item.smooth.visible = true;
                    item.smooth.position.set(worldX, worldY, 0.03);
                    item.smooth.rotation.y = time * 1.5 + k;

                    if (item.stage === 2) {
                        // Color transforms
                        var transformT = (item.x - 0.0) / 0.2;
                        var r = 0.85 - transformT * 0.55;
                        var g = 0.65 + transformT * 0.02;
                        var b = 0.25 + transformT * 0.6;
                        item.smooth.material.color.setRGB(r, g, b);
                        item.smooth.material.opacity = 0.6;
                    } else if (item.stage === 3) {
                        // Validate flash
                        item.smooth.material.color.setHex(0x44aadd);
                        item.smooth.material.opacity = 0.6 + Math.sin(time * 10) * 0.2;
                        // Check mark flash
                        if (Math.random() < 0.02) {
                            this._spawnCheck(worldX, worldY);
                        }
                    } else {
                        // Polished output
                        item.smooth.material.color.setHex(0x44ddaa);
                        item.smooth.material.opacity = Math.max(0, 0.6 - (item.x - 0.4) * 2);
                    }
                }
            }

            // Stage flash effects pulse
            for (var si = 0; si < this._stageFlashes.length; si++) {
                this._stageFlashes[si].material.opacity = 0.1 + Math.sin(time * 4 + si * 2) * 0.05;
            }

            model.position.set(ox, oy + Math.sin(time * 2) * 0.008, oz);
        } else {
            // Phase 3: Settle, fade out
            var t3 = (progress - 0.82) / 0.18;
            this._belt.material.opacity = 0.4 * (1 - t3);
            for (var bi = 0; bi < this._beltMarks.length; bi++) {
                this._beltMarks[bi].material.opacity = 0.3 * (1 - t3);
            }
            for (var di = 0; di < this._dividers.length; di++) {
                this._dividers[di].material.opacity = 0.3 * (1 - t3);
            }
            for (var fi = 0; fi < this._stageFlashes.length; fi++) {
                this._stageFlashes[fi].material.opacity = 0.1 * (1 - t3);
            }
            for (var ii = 0; ii < this._items.length; ii++) {
                this._items[ii].rough.material.opacity *= 0.92;
                this._items[ii].smooth.material.opacity *= 0.92;
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update check particles
        for (var ci = 0; ci < this._checks.length; ci++) {
            var ch = this._checks[ci];
            if (ch.life <= 0) continue;
            ch.life -= delta;
            if (ch.life <= 0) { ch.mesh.visible = false; continue; }
            ch.mesh.position.x += ch.vx * delta;
            ch.mesh.position.y += ch.vy * delta;
            var lr = ch.life / ch.maxLife;
            ch.mesh.material.opacity = lr * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._belt) { scene.remove(this._belt); this._belt.geometry.dispose(); this._belt.material.dispose(); }
        if (this._beltMarks) { this._beltMarks.forEach(function(m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
        if (this._dividers) { this._dividers.forEach(function(d) { scene.remove(d); d.geometry.dispose(); d.material.dispose(); }); }
        if (this._items) {
            this._items.forEach(function(i) {
                scene.remove(i.rough); i.rough.geometry.dispose(); i.rough.material.dispose();
                scene.remove(i.smooth); i.smooth.geometry.dispose(); i.smooth.material.dispose();
            });
        }
        if (this._stageFlashes) { this._stageFlashes.forEach(function(f) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); }); }
        if (this._checks) { this._checks.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        this._belt = this._beltMarks = this._dividers = this._items = this._stageFlashes = this._checks = null;
    }
};
