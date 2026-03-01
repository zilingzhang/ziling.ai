export default {
    name: 'Julienning',
    label: 'julienning',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Target block (vegetable to cut)
        var blockGeo = new THREE.BoxGeometry(0.25, 0.18, 0.18);
        var blockMat = new THREE.MeshBasicMaterial({
            color: 0xff7733, transparent: true, opacity: 0
        });
        this._block = new THREE.Mesh(blockGeo, blockMat);
        this._block.position.set(ox - 0.3, oy - 0.15, 0);
        scene.add(this._block);
        this._blockWidth = 0.25;

        // Cutting board
        var boardGeo = new THREE.BoxGeometry(0.5, 0.025, 0.25);
        var boardMat = new THREE.MeshBasicMaterial({
            color: 0x996633, transparent: true, opacity: 0
        });
        this._board = new THREE.Mesh(boardGeo, boardMat);
        this._board.position.set(ox - 0.3, oy - 0.25, 0);
        scene.add(this._board);

        // Julienned strips (thin rectangles that fly off)
        this._strips = [];
        var stripGeo = new THREE.BoxGeometry(0.015, 0.14, 0.015);
        for (var i = 0; i < 20; i++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xff8844 : (i % 3 === 1 ? 0xff9955 : 0xee7733),
                transparent: true, opacity: 0
            });
            var strip = new THREE.Mesh(stripGeo, stMat);
            strip.visible = false;
            scene.add(strip);
            this._strips.push({
                mesh: strip, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0, vrot: 0,
                settled: false, settleX: 0, settleY: 0
            });
        }
        this._stripIdx = 0;

        // Blade flash lines
        this._flashes = [];
        for (var f = 0; f < 8; f++) {
            var flashGeo = new THREE.BufferGeometry();
            var flashPos = new Float32Array([0, 0, 0, 0, 0, 0]);
            flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPos, 3));
            var flashMat = new THREE.LineBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var flash = new THREE.Line(flashGeo, flashMat);
            flash.visible = false;
            scene.add(flash);
            this._flashes.push({ line: flash, life: 0 });
        }
        this._flashIdx = 0;

        // Sparks at cut point
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffffff : 0xffdd88,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._spkIdx = 0;

        this._chopCount = 0;
        this._lastChop = 0;
        this._settledStrips = 0;
    },
    _doChop(cutX, cutY, time) {
        // Emit strip
        var st = this._strips[this._stripIdx % this._strips.length];
        this._stripIdx++;
        st.mesh.visible = true;
        st.mesh.position.set(cutX, cutY, 0);
        st.mesh.material.opacity = 0.85;
        st.vx = -0.5 - Math.random() * 0.8;
        st.vy = 0.3 + Math.random() * 0.5;
        st.vz = (Math.random() - 0.5) * 0.3;
        st.vrot = (Math.random() - 0.5) * 5;
        st.life = 0.6 + Math.random() * 0.3;
        st.maxLife = st.life;
        st.settled = false;
        st.settleX = cutX - 0.4 - Math.random() * 0.15;
        st.settleY = cutY - 0.1 + this._settledStrips * 0.003;
        this._settledStrips++;

        // Blade flash
        var fl = this._flashes[this._flashIdx % this._flashes.length];
        this._flashIdx++;
        var pos = fl.line.geometry.attributes.position.array;
        pos[0] = cutX - 0.05; pos[1] = cutY + 0.15; pos[2] = 0;
        pos[3] = cutX + 0.05; pos[4] = cutY - 0.15; pos[5] = 0;
        fl.line.geometry.attributes.position.needsUpdate = true;
        fl.line.visible = true;
        fl.line.material.opacity = 1.0;
        fl.life = 0.12;

        // Sparks
        for (var i = 0; i < 3; i++) {
            var sp = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            sp.mesh.visible = true;
            sp.mesh.position.set(cutX, cutY, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 1.5;
            sp.vx = Math.cos(a) * spd;
            sp.vy = Math.sin(a) * spd;
            sp.vz = (Math.random() - 0.5) * 0.5;
            sp.life = 0.15 + Math.random() * 0.15;
            sp.maxLife = sp.life;
            sp.mesh.material.opacity = 0.8;
        }

        this._chopCount++;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var blockX = ox - 0.3;
        var blockY = oy - 0.15;

        if (progress < 0.08) {
            // Phase 1: Block and board appear
            var t = progress / 0.08;
            var ease = t * t;
            this._block.material.opacity = ease * 0.8;
            this._board.material.opacity = ease * 0.6;
            model.position.set(ox + 0.05, oy, oz);
        } else if (progress < 0.70) {
            // Phase 2: Rapid chopping cycle
            var t2 = (progress - 0.08) / 0.62;
            this._block.material.opacity = 0.8;
            this._board.material.opacity = 0.6;

            // Block shrinks as slices come off
            var shrink = Math.max(0.2, 1 - this._chopCount * 0.05);
            this._block.scale.x = shrink;

            // Chop rhythm
            var chopCycle = (time * 4.0) % 1.0;
            if (chopCycle < 0.12) {
                // Down stroke
                var downT = chopCycle / 0.12;
                model.position.set(ox + 0.05, oy + 0.12 * (1 - downT), oz);
                model.rotation.z = -0.1 * downT;

                if (chopCycle < 0.02 && time - this._lastChop > 0.2) {
                    this._doChop(blockX + shrink * 0.12, blockY, time);
                    this._lastChop = time;
                }
            } else if (chopCycle < 0.5) {
                // Raise
                var upT = (chopCycle - 0.12) / 0.38;
                model.position.set(ox + 0.05, oy + upT * 0.12, oz);
                model.rotation.z = -0.1 + upT * 0.1;
            } else {
                // Hold high
                model.position.set(ox + 0.05, oy + 0.12, oz);
                model.rotation.z = 0;
            }
        } else if (progress < 0.85) {
            // Phase 3: Final precision cuts with flourish
            var t3 = (progress - 0.70) / 0.15;

            // Faster chops
            var fastCycle = (time * 6.0) % 1.0;
            if (fastCycle < 0.1) {
                model.position.set(ox + 0.05, oy + 0.1 * (1 - fastCycle / 0.1), oz);
                model.rotation.z = -0.12 * (fastCycle / 0.1);
                if (fastCycle < 0.02 && time - this._lastChop > 0.12) {
                    var shrink2 = Math.max(0.1, 1 - this._chopCount * 0.05);
                    this._doChop(blockX + shrink2 * 0.12, blockY, time);
                    this._lastChop = time;
                }
            } else {
                var upT2 = Math.min((fastCycle - 0.1) / 0.3, 1);
                model.position.set(ox + 0.05, oy + upT2 * 0.1, oz);
                model.rotation.z = -0.12 * (1 - upT2);
            }

            // Block nearly gone
            var finalShrink = Math.max(0.05, 1 - this._chopCount * 0.05);
            this._block.scale.x = finalShrink;
            this._block.material.opacity = 0.8 * finalShrink;
        } else {
            // Phase 4: Strips pile neatly, model rests
            var t4 = (progress - 0.85) / 0.15;
            model.position.set(ox + 0.05 * (1 - t4), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._block.material.opacity = 0.1 * (1 - t4);
            this._board.material.opacity = 0.6 * (1 - t4);
        }

        // Update strips (fly then settle into pile)
        for (var si = 0; si < this._strips.length; si++) {
            var ss = this._strips[si];
            if (!ss.mesh.visible) continue;
            if (ss.settled) {
                // Already settled, just fade at end
                if (progress > 0.85) {
                    ss.mesh.material.opacity *= (1 - (progress - 0.85) / 0.15);
                }
                continue;
            }
            if (ss.life > 0) {
                ss.life -= delta;
                ss.mesh.position.x += ss.vx * delta;
                ss.mesh.position.y += ss.vy * delta;
                ss.mesh.position.z += ss.vz * delta;
                ss.vy -= 3 * delta;
                ss.mesh.rotation.z += ss.vrot * delta;
                if (ss.life <= 0) {
                    // Settle into pile
                    ss.settled = true;
                    ss.mesh.position.set(ss.settleX, ss.settleY, 0);
                    ss.mesh.rotation.z = Math.PI * 0.5 + (Math.random() - 0.5) * 0.2;
                    ss.mesh.material.opacity = 0.7;
                }
            }
        }

        // Update flashes
        for (var fi = 0; fi < this._flashes.length; fi++) {
            var ff = this._flashes[fi];
            if (ff.life <= 0) continue;
            ff.life -= delta;
            if (ff.life <= 0) { ff.line.visible = false; continue; }
            ff.line.material.opacity = ff.life / 0.12;
        }

        // Update sparks
        for (var ki = 0; ki < this._sparks.length; ki++) {
            var sk = this._sparks[ki];
            if (sk.life <= 0) continue;
            sk.life -= delta;
            if (sk.life <= 0) { sk.mesh.visible = false; continue; }
            sk.mesh.position.x += sk.vx * delta;
            sk.mesh.position.y += sk.vy * delta;
            sk.mesh.position.z += sk.vz * delta;
            sk.vy -= 5 * delta;
            var lr = sk.life / sk.maxLife;
            sk.mesh.material.opacity = lr * 0.8;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._block) { scene.remove(this._block); this._block.geometry.dispose(); this._block.material.dispose(); }
        if (this._board) { scene.remove(this._board); this._board.geometry.dispose(); this._board.material.dispose(); }
        if (this._strips) { this._strips.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._flashes) { this._flashes.forEach(function(f) { scene.remove(f.line); f.line.geometry.dispose(); f.line.material.dispose(); }); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._block = this._board = this._strips = this._flashes = this._sparks = null;
    }
};
