export default {
    name: 'Gitifying',
    label: 'gitifying',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Branch lines (horizontal cylinders)
        this._branches = [];
        var branchColors = [0x44cc66, 0x66dd88, 0x88eebb, 0x33aa55];
        for (var i = 0; i < 4; i++) {
            var bGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
            bGeo.rotateZ(Math.PI / 2);
            var bMat = new THREE.MeshBasicMaterial({
                color: branchColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var branch = new THREE.Mesh(bGeo, bMat);
            var yOff = -0.2 + i * 0.13;
            branch.position.set(ox - 0.5, oy + yOff, 0);
            scene.add(branch);
            this._branches.push({ mesh: branch, targetLen: 0.8 + Math.random() * 0.3, yOff: yOff });
        }

        // Commit dots (spheres on timeline)
        this._commits = [];
        var commitGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var commitPositions = [
            { x: -0.35, b: 0 }, { x: -0.15, b: 0 }, { x: 0.05, b: 1 },
            { x: 0.15, b: 0 }, { x: -0.05, b: 2 }, { x: 0.25, b: 1 },
            { x: 0.1, b: 3 }, { x: 0.35, b: 0 }, { x: 0.3, b: 2 },
            { x: -0.25, b: 1 }, { x: 0.0, b: 3 }, { x: 0.4, b: 1 }
        ];
        for (var j = 0; j < 12; j++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: branchColors[commitPositions[j].b], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var commit = new THREE.Mesh(commitGeo, cMat);
            var cy = oy + this._branches[commitPositions[j].b].yOff;
            commit.position.set(ox + commitPositions[j].x, cy, 0.02);
            commit.visible = false;
            scene.add(commit);
            this._commits.push({ mesh: commit, delay: j * 0.06 });
        }

        // Merge diamond
        var diamGeo = new THREE.OctahedronGeometry(0.06, 0);
        var diamMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._diamond = new THREE.Mesh(diamGeo, diamMat);
        this._diamond.position.set(ox + 0.35, oy + this._branches[0].yOff, 0.03);
        scene.add(this._diamond);

        // Conflict sparks (red then green)
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var k = 0; k < 30; k++) {
            var spkMat = new THREE.MeshBasicMaterial({
                color: 0xff4444, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, spkMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // PR celebration particles
        this._celebParts = [];
        var celebGeo = new THREE.SphereGeometry(0.018, 6, 6);
        for (var m = 0; m < 25; m++) {
            var celebColors = [0x44ff66, 0x88ffaa, 0x22dd44, 0xaaffcc, 0xff8800];
            var ceMat = new THREE.MeshBasicMaterial({
                color: celebColors[m % celebColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ce = new THREE.Mesh(celebGeo, ceMat);
            ce.visible = false;
            scene.add(ce);
            this._celebParts.push({ mesh: ce, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._celebIdx = 0;

        // Git log lines (thin boxes as text lines)
        this._logLines = [];
        for (var n = 0; n < 6; n++) {
            var llGeo = new THREE.BoxGeometry(0.2 + Math.random() * 0.15, 0.008, 0.002);
            var llMat = new THREE.MeshBasicMaterial({
                color: n % 2 === 0 ? 0x44cc66 : 0xff8800, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ll = new THREE.Mesh(llGeo, llMat);
            ll.position.set(ox + 0.5, oy + 0.2 - n * 0.06, 0.01);
            ll.visible = false;
            scene.add(ll);
            this._logLines.push(ll);
        }

        this._lastSpark = 0;
        this._conflictDone = false;
        this._celebDone = false;
    },
    _emitSparks(x, y, color) {
        for (var i = 0; i < 5; i++) {
            var s = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            s.mesh.material.color.setHex(color);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.0;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 1.0;
            s.life = 0.3 + Math.random() * 0.25;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
        }
    },
    _emitCeleb(x, y) {
        for (var i = 0; i < 12; i++) {
            var c = this._celebParts[this._celebIdx % this._celebParts.length];
            this._celebIdx++;
            c.mesh.visible = true;
            c.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            c.vx = Math.cos(a) * spd;
            c.vy = Math.sin(a) * spd;
            c.vz = (Math.random() - 0.5) * 1.5;
            c.life = 0.6 + Math.random() * 0.5;
            c.maxLife = c.life;
            c.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Branch lines grow
            var t = progress / 0.10;
            for (var bi = 0; bi < this._branches.length; bi++) {
                var br = this._branches[bi];
                var brDelay = bi * 0.2;
                var brT = Math.max(0, Math.min(1, (t - brDelay) / 0.5));
                var len = br.targetLen * brT;
                br.mesh.scale.set(len / 0.01, 1, 1);
                br.mesh.position.set(ox - 0.5 + len * 0.5, oy + br.yOff, 0);
                br.mesh.material.opacity = brT * 0.6;
            }
            model.position.set(ox - 0.6, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Commits appear along branches
            var t2 = (progress - 0.10) / 0.25;

            for (var bj = 0; bj < this._branches.length; bj++) {
                this._branches[bj].mesh.material.opacity = 0.6 + Math.sin(time * 2 + bj) * 0.1;
            }

            for (var ci = 0; ci < this._commits.length; ci++) {
                var cm = this._commits[ci];
                if (t2 > cm.delay) {
                    cm.mesh.visible = true;
                    var cmT = Math.min(1, (t2 - cm.delay) / 0.1);
                    cm.mesh.material.opacity = cmT * 0.8;
                    cm.mesh.scale.setScalar(cmT);
                }
            }

            model.position.set(ox - 0.6 + t2 * 0.3, oy + Math.sin(time * 2) * 0.02, oz);
        } else if (progress < 0.50) {
            // Phase 3: Conflict! Red sparks
            var t3 = (progress - 0.35) / 0.15;

            if (time - this._lastSpark > 0.08 && t3 < 0.6) {
                this._emitSparks(ox + 0.1, oy + this._branches[1].yOff, 0xff4444);
                this._lastSpark = time;
            }

            // After halfway, resolution green sparks
            if (t3 > 0.5 && time - this._lastSpark > 0.08) {
                this._emitSparks(ox + 0.1, oy + this._branches[1].yOff, 0x44ff66);
                this._lastSpark = time;
            }

            model.position.set(ox - 0.3, oy + Math.sin(time * 4) * 0.03, oz);
            model.rotation.z = Math.sin(time * 3) * 0.05;
        } else if (progress < 0.65) {
            // Phase 4: Merge! Diamond flash
            var t4 = (progress - 0.50) / 0.15;

            this._diamond.material.opacity = Math.min(1, t4 * 2);
            this._diamond.rotation.y = time * 3;
            this._diamond.scale.setScalar(1 + Math.sin(t4 * Math.PI) * 0.5);

            model.position.set(ox - 0.3, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.80) {
            // Phase 5: PR merge celebration
            var t5 = (progress - 0.65) / 0.15;

            if (!this._celebDone) {
                this._emitCeleb(ox + 0.35, oy);
                this._celebDone = true;
            }

            this._diamond.material.opacity = 1.0 - t5 * 0.3;
            this._diamond.rotation.y = time * 3;

            // Git log scrolls in
            for (var li = 0; li < this._logLines.length; li++) {
                var llDelay = li * 0.15;
                if (t5 > llDelay) {
                    this._logLines[li].visible = true;
                    var llT = Math.min(1, (t5 - llDelay) / 0.2);
                    this._logLines[li].material.opacity = llT * 0.5;
                    this._logLines[li].position.x = ox + 0.5 - llT * 0.15;
                }
            }

            model.position.set(ox, oy + Math.sin(t5 * Math.PI) * 0.08, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.80) / 0.20;

            for (var bk = 0; bk < this._branches.length; bk++) {
                this._branches[bk].mesh.material.opacity = 0.6 * (1 - t6);
            }
            for (var cj = 0; cj < this._commits.length; cj++) {
                this._commits[cj].mesh.material.opacity = 0.8 * (1 - t6);
            }
            this._diamond.material.opacity = 0.7 * (1 - t6);
            for (var lj = 0; lj < this._logLines.length; lj++) {
                this._logLines[lj].material.opacity = 0.5 * (1 - t6);
            }

            model.position.set(ox, oy, oz);
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
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 3 * delta;
            sp.mesh.material.opacity = sp.life / sp.maxLife;
        }

        // Update celebration particles
        for (var cei = 0; cei < this._celebParts.length; cei++) {
            var cp = this._celebParts[cei];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.z += cp.vz * delta;
            cp.vy -= 2 * delta;
            cp.mesh.material.opacity = cp.life / cp.maxLife;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._branches) {
            this._branches.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._commits) {
            this._commits.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._diamond) { scene.remove(this._diamond); this._diamond.geometry.dispose(); this._diamond.material.dispose(); }
        if (this._sparks) {
            this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._celebParts) {
            this._celebParts.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._logLines) {
            this._logLines.forEach(function(l) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
        }
        this._branches = this._commits = this._diamond = this._sparks = this._celebParts = this._logLines = null;
    }
};
