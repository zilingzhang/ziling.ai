export default {
    name: 'Actioning',
    label: 'actioning',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Action arrows (stretched triangles pointing forward)
        this._arrows = [];
        var arrowGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
        for (var i = 0; i < 5; i++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff3333 : 0x33ff33,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var arrow = new THREE.Mesh(arrowGeo, aMat);
            arrow.rotation.z = -Math.PI * 0.5;
            arrow.visible = false;
            scene.add(arrow);
            this._arrows.push({
                mesh: arrow,
                targetX: ox + 0.4 + i * 0.2,
                targetY: oy + (Math.random() - 0.5) * 0.4,
                hit: false, hitTime: 0
            });
        }

        // Target markers (small cubes to be eliminated)
        this._targets = [];
        var tgtGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        for (var j = 0; j < 5; j++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xff4444, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tgt = new THREE.Mesh(tgtGeo, tMat);
            tgt.position.set(
                ox + 0.4 + j * 0.2,
                oy + (Math.random() - 0.5) * 0.4,
                0
            );
            tgt.visible = false;
            scene.add(tgt);
            this._targets.push({ mesh: tgt, alive: true });
        }

        // Speed line particles
        this._speedLines = [];
        var lineGeo = new THREE.BoxGeometry(0.15, 0.005, 0.005);
        for (var k = 0; k < 20; k++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0xff6644 : 0x44ff66,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ln = new THREE.Mesh(lineGeo, lMat);
            ln.visible = false;
            scene.add(ln);
            this._speedLines.push({
                mesh: ln, life: 0, maxLife: 0, vx: 0
            });
        }
        this._lineIdx = 0;

        // Impact burst particles
        this._bursts = [];
        var burstGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var b = 0; b < 25; b++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: b % 3 === 0 ? 0xff4444 : (b % 3 === 1 ? 0x44ff44 : 0xffff44),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var burst = new THREE.Mesh(burstGeo, bMat);
            burst.visible = false;
            scene.add(burst);
            this._bursts.push({
                mesh: burst, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._burstIdx = 0;

        this._currentTarget = 0;
        this._chargeStart = 0;
    },
    _spawnBurst(x, y, count) {
        for (var i = 0; i < count; i++) {
            var b = this._bursts[this._burstIdx % this._bursts.length];
            this._burstIdx++;
            b.mesh.visible = true;
            b.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.0 + Math.random() * 2.0;
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            b.life = 0.3 + Math.random() * 0.3;
            b.maxLife = b.life;
            b.mesh.material.opacity = 1.0;
        }
    },
    _spawnSpeedLine(x, y) {
        var sl = this._speedLines[this._lineIdx % this._speedLines.length];
        this._lineIdx++;
        sl.mesh.visible = true;
        sl.mesh.position.set(x - 0.2, y + (Math.random() - 0.5) * 0.15, 0);
        sl.vx = -2.0 - Math.random() * 1.5;
        sl.life = 0.2 + Math.random() * 0.2;
        sl.maxLife = sl.life;
        sl.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.06) {
            // Phase 1: Targets appear
            var t = progress / 0.06;
            for (var i = 0; i < this._targets.length; i++) {
                var delay = i * 0.15;
                var ti = Math.max(0, t - delay);
                this._targets[i].mesh.visible = ti > 0;
                this._targets[i].mesh.material.opacity = Math.min(ti, 0.7);
                this._targets[i].mesh.rotation.y = time * 2;
            }
            // Arrow points
            this._arrows[0].mesh.visible = true;
            this._arrows[0].mesh.material.opacity = t * 0.8;
            this._arrows[0].mesh.position.set(ox + 0.1, oy, 0.05);
        } else if (progress < 0.85) {
            // Phase 2: Rapid execution chain
            var attackProg = (progress - 0.06) / 0.79;
            var targetIdx = Math.min(Math.floor(attackProg * 5), 4);

            // Update current target
            if (targetIdx !== this._currentTarget) {
                // Eliminate previous target
                if (this._currentTarget < 5 && this._targets[this._currentTarget].alive) {
                    var prevTgt = this._targets[this._currentTarget];
                    prevTgt.alive = false;
                    this._spawnBurst(prevTgt.mesh.position.x, prevTgt.mesh.position.y, 6);
                }
                this._currentTarget = targetIdx;
                this._chargeStart = time;
            }

            // Targets spin, alive ones pulse
            for (var j = 0; j < this._targets.length; j++) {
                var tgt = this._targets[j];
                tgt.mesh.rotation.y = time * 3;
                tgt.mesh.rotation.x = time * 2;
                if (!tgt.alive) {
                    tgt.mesh.material.opacity *= 0.95;
                    tgt.mesh.scale.setScalar(Math.max(0.01, tgt.mesh.scale.x * 0.97));
                } else if (j === targetIdx) {
                    tgt.mesh.material.opacity = 0.6 + Math.sin(time * 10) * 0.3;
                    tgt.mesh.visible = true;
                } else {
                    tgt.mesh.material.opacity = 0.5;
                    tgt.mesh.visible = true;
                }
            }

            // Arrow points at current target
            if (targetIdx < 5) {
                var curTarget = this._targets[targetIdx];
                var arw = this._arrows[targetIdx];
                arw.mesh.visible = true;

                var localProg = (attackProg * 5) - targetIdx;
                if (localProg < 0.4) {
                    // Charge
                    arw.mesh.position.set(
                        ox + 0.1 + localProg * 0.3,
                        oy + (curTarget.mesh.position.y - oy) * localProg * 2,
                        0.05
                    );
                    arw.mesh.material.opacity = 0.8;
                } else {
                    // Strike through
                    var strikeProg = (localProg - 0.4) / 0.6;
                    arw.mesh.position.set(
                        ox + 0.1 + 0.12 + strikeProg * (curTarget.mesh.position.x - ox - 0.1),
                        curTarget.mesh.position.y,
                        0.05
                    );
                    arw.mesh.material.opacity = 0.8 * (1 - strikeProg * 0.5);
                }
            }

            // Model charges toward current target
            if (targetIdx < 5) {
                var chargeT = Math.min((time - this._chargeStart) * 2, 1);
                var tgtPos = this._targets[targetIdx].mesh.position;
                model.position.set(
                    ox + chargeT * (tgtPos.x - ox) * 0.5,
                    oy + chargeT * (tgtPos.y - oy) * 0.3,
                    oz
                );
                model.rotation.z = -chargeT * 0.1;
            }

            // Speed lines
            if (Math.random() < 0.3) {
                this._spawnSpeedLine(model.position.x, model.position.y);
            }
        } else {
            // Phase 3: Final burst and settle
            var t3 = (progress - 0.85) / 0.15;
            // Kill last target
            if (this._targets[4].alive) {
                this._targets[4].alive = false;
                this._spawnBurst(this._targets[4].mesh.position.x, this._targets[4].mesh.position.y, 8);
            }

            for (var m = 0; m < this._targets.length; m++) {
                this._targets[m].mesh.material.opacity *= 0.9;
            }
            for (var n = 0; n < this._arrows.length; n++) {
                this._arrows[n].mesh.material.opacity *= 0.9;
            }

            model.position.set(ox + 0.1 * (1 - t3), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update burst particles
        for (var bi = 0; bi < this._bursts.length; bi++) {
            var bp = this._bursts[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            bp.vy -= 2 * delta;
            var lr = bp.life / bp.maxLife;
            bp.mesh.material.opacity = lr;
            bp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Update speed lines
        for (var li = 0; li < this._speedLines.length; li++) {
            var sl = this._speedLines[li];
            if (sl.life <= 0) continue;
            sl.life -= delta;
            if (sl.life <= 0) { sl.mesh.visible = false; continue; }
            sl.mesh.position.x += sl.vx * delta;
            var slr = sl.life / sl.maxLife;
            sl.mesh.material.opacity = slr * 0.6;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._arrows) { this._arrows.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        if (this._targets) { this._targets.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._speedLines) { this._speedLines.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._bursts) { this._bursts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        this._arrows = this._targets = this._speedLines = this._bursts = null;
    }
};
