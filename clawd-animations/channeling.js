export default {
    name: 'Channeling',
    label: 'channeling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Energy source points (4 corners)
        this._sources = [
            { x: ox - 0.8, y: oy + 0.6 },
            { x: ox + 0.8, y: oy + 0.6 },
            { x: ox - 0.8, y: oy - 0.6 },
            { x: ox + 0.8, y: oy - 0.6 }
        ];

        // Source glow orbs
        this._sourceOrbs = [];
        var orbGeo = new THREE.SphereGeometry(0.06, 8, 8);
        for (var i = 0; i < 4; i++) {
            var orbMat = new THREE.MeshBasicMaterial({
                color: 0x4488ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(this._sources[i].x, this._sources[i].y, 0);
            scene.add(orb);
            this._sourceOrbs.push(orb);
        }

        // Stream particles (flowing toward model)
        this._streams = [];
        var stGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var j = 0; j < 50; j++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: j % 4 === 0 ? 0x4488ff : (j % 4 === 1 ? 0x66aaff : (j % 4 === 2 ? 0x88ccff : 0xaaddff)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var st = new THREE.Mesh(stGeo, stMat);
            st.visible = false;
            scene.add(st);
            this._streams.push({
                mesh: st, life: 0, maxLife: 0,
                sourceIdx: j % 4, t: 0,
                startX: 0, startY: 0
            });
        }
        this._stIdx = 0;

        // Conduit glow (around model)
        var conduitGeo = new THREE.SphereGeometry(0.2, 16, 16);
        var conduitMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._conduit = new THREE.Mesh(conduitGeo, conduitMat);
        this._conduit.position.set(ox, oy, 0);
        scene.add(this._conduit);

        // Output beam (fires forward from model)
        this._beamParts = [];
        var beamGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        for (var k = 0; k < 20; k++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0xeeffff : 0x88ccff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bm = new THREE.Mesh(beamGeo, bMat);
            bm.visible = false;
            scene.add(bm);
            this._beamParts.push({
                mesh: bm, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._beamIdx = 0;

        // Target point (where output goes)
        var targetGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var targetMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._target = new THREE.Mesh(targetGeo, targetMat);
        this._target.position.set(ox + 0.7, oy, 0);
        scene.add(this._target);

        // Inner conduit rings
        this._rings = [];
        var ringGeo = new THREE.TorusGeometry(0.15, 0.008, 6, 16);
        for (var r = 0; r < 3; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: 0x66bbff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.position.set(ox, oy, 0);
            scene.add(ring);
            this._rings.push(ring);
        }

        this._channelWidth = 0;
    },
    _spawnStream(sourceIdx) {
        var s = this._streams[this._stIdx % this._streams.length];
        this._stIdx++;
        var src = this._sources[sourceIdx];
        s.mesh.visible = true;
        s.mesh.position.set(src.x, src.y, 0);
        s.startX = src.x;
        s.startY = src.y;
        s.sourceIdx = sourceIdx;
        s.t = 0;
        s.life = 0.8 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    _spawnBeam(x, y) {
        var b = this._beamParts[this._beamIdx % this._beamParts.length];
        this._beamIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x, y, 0);
        b.vx = 2.5 + Math.random() * 1.5;
        b.vy = (Math.random() - 0.5) * 0.3;
        b.life = 0.3 + Math.random() * 0.2;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.9;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Source orbs light up
            var t = progress / 0.10;
            for (var i = 0; i < 4; i++) {
                var delay = i * 0.2;
                var ti = Math.max(0, (t - delay) / (1 - delay));
                this._sourceOrbs[i].material.opacity = ti * 0.7;
                this._sourceOrbs[i].scale.setScalar(0.5 + ti * 0.5);
            }
        } else if (progress < 0.40) {
            // Phase 2: Energy streams flow toward model
            var t2 = (progress - 0.10) / 0.30;
            this._channelWidth = t2;

            for (var j = 0; j < 4; j++) {
                this._sourceOrbs[j].material.opacity = 0.5 + Math.sin(time * 4 + j) * 0.2;
                this._sourceOrbs[j].scale.setScalar(0.8 + Math.sin(time * 3 + j) * 0.2);
            }

            // Spawn stream particles
            if (Math.random() < 0.2 + t2 * 0.3) {
                this._spawnStream(Math.floor(Math.random() * 4));
            }

            // Conduit glow builds
            this._conduit.material.opacity = t2 * 0.2;
            this._conduit.scale.setScalar(1 + Math.sin(time * 5) * 0.1);

            // Rings appear and spin
            for (var ri = 0; ri < 3; ri++) {
                this._rings[ri].material.opacity = t2 * 0.4;
                this._rings[ri].rotation.x = time * (2 + ri * 0.5);
                this._rings[ri].rotation.y = time * (1.5 + ri * 0.3);
            }

            model.position.set(ox, oy + Math.sin(time * 3) * 0.01 * t2, oz);
        } else if (progress < 0.75) {
            // Phase 3: Intensify, channel opens wider, output beam fires
            var t3 = (progress - 0.40) / 0.35;
            this._channelWidth = 1 + t3 * 0.5;

            for (var si = 0; si < 4; si++) {
                this._sourceOrbs[si].material.opacity = 0.7 + Math.sin(time * 6 + si) * 0.2;
            }

            // More streams
            if (Math.random() < 0.4 + t3 * 0.3) {
                this._spawnStream(Math.floor(Math.random() * 4));
            }

            // Conduit intensifies
            this._conduit.material.opacity = 0.2 + t3 * 0.3;
            this._conduit.scale.setScalar(1 + Math.sin(time * 5) * 0.15 + t3 * 0.3);
            // Conduit color gets brighter
            var cBright = 0.3 + t3 * 0.7;
            this._conduit.material.color.setRGB(cBright * 0.3, cBright * 0.5, cBright);

            // Rings spin faster
            for (var rj = 0; rj < 3; rj++) {
                this._rings[rj].material.opacity = 0.4 + t3 * 0.3;
                this._rings[rj].rotation.x = time * (3 + rj * 0.8);
                this._rings[rj].rotation.y = time * (2.5 + rj * 0.5);
                this._rings[rj].scale.setScalar(1 + t3 * 0.2);
            }

            // Output beam fires
            if (t3 > 0.2 && Math.random() < 0.3 + t3 * 0.4) {
                this._spawnBeam(ox + 0.15, oy + (Math.random() - 0.5) * 0.05);
            }

            // Target pulses
            this._target.material.opacity = Math.max(0, t3 - 0.2) * (0.4 + Math.sin(time * 6) * 0.2);
            this._target.scale.setScalar(0.5 + Math.max(0, t3 - 0.2) * 1.0 + Math.sin(time * 4) * 0.1);

            // Model glows brighter (scale pulse)
            model.position.set(ox, oy + Math.sin(time * 3) * 0.015, oz);
            model.scale.copy(this._origScale).multiplyScalar(1 + t3 * 0.05);
        } else if (progress < 0.90) {
            // Phase 4: Peak channeling, everything bright
            var t4 = (progress - 0.75) / 0.15;

            for (var sk = 0; sk < 4; sk++) {
                this._sourceOrbs[sk].material.opacity = 0.9 * (1 - t4 * 0.5);
            }

            if (Math.random() < 0.3 * (1 - t4)) {
                this._spawnStream(Math.floor(Math.random() * 4));
            }
            if (Math.random() < 0.4 * (1 - t4)) {
                this._spawnBeam(ox + 0.15, oy + (Math.random() - 0.5) * 0.05);
            }

            this._conduit.material.opacity = 0.5 * (1 - t4);
            this._target.material.opacity = 0.6 * (1 - t4);

            for (var rk = 0; rk < 3; rk++) {
                this._rings[rk].material.opacity = 0.7 * (1 - t4);
                this._rings[rk].rotation.x = time * 4;
                this._rings[rk].rotation.y = time * 3;
            }

            model.position.set(ox, oy, oz);
            model.scale.copy(this._origScale).multiplyScalar(1 + 0.05 * (1 - t4));
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.90) / 0.10;
            for (var so = 0; so < 4; so++) {
                this._sourceOrbs[so].material.opacity = 0.45 * (1 - t5);
            }
            this._conduit.material.opacity = 0;
            this._target.material.opacity = 0;
            for (var rl = 0; rl < 3; rl++) {
                this._rings[rl].material.opacity = 0;
            }
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update stream particles
        for (var pi = 0; pi < this._streams.length; pi++) {
            var p = this._streams[pi];
            if (p.life <= 0) continue;
            p.life -= delta;
            if (p.life <= 0) { p.mesh.visible = false; continue; }
            // Move toward model center using lerp
            p.t += delta * (1.5 + this._channelWidth);
            var lerpT = Math.min(p.t / p.maxLife, 1);
            var curveOffset = Math.sin(lerpT * Math.PI) * 0.15;
            p.mesh.position.x = p.startX + (ox - p.startX) * lerpT + curveOffset * (p.sourceIdx % 2 === 0 ? 1 : -1);
            p.mesh.position.y = p.startY + (oy - p.startY) * lerpT + curveOffset * (p.sourceIdx < 2 ? -1 : 1);
            var lr = p.life / p.maxLife;
            p.mesh.material.opacity = lr * 0.7;
            p.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Update beam particles
        for (var bi = 0; bi < this._beamParts.length; bi++) {
            var bp = this._beamParts[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            var blr = bp.life / bp.maxLife;
            bp.mesh.material.opacity = blr * 0.8;
            bp.mesh.rotation.z += delta * 5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._sourceOrbs) { this._sourceOrbs.forEach(function(o) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }); }
        if (this._streams) { this._streams.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._conduit) { scene.remove(this._conduit); this._conduit.geometry.dispose(); this._conduit.material.dispose(); }
        if (this._beamParts) { this._beamParts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._target) { scene.remove(this._target); this._target.geometry.dispose(); this._target.material.dispose(); }
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r); r.geometry.dispose(); r.material.dispose(); }); }
        this._sourceOrbs = this._streams = this._conduit = this._beamParts = this._target = this._rings = null;
    }
};
