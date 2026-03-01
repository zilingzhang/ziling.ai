export default {
    name: 'Gusting',
    label: 'gusting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Leaf particles (flat discs tumbling in wind)
        this._leaves = [];
        var leafColors = [0xcc8833, 0xdd9944, 0xaa6622, 0xbb7733, 0x998844, 0xddaa55];
        var leafGeo = new THREE.CircleGeometry(0.02, 5);
        for (var i = 0; i < 25; i++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: leafColors[i % leafColors.length],
                transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false
            });
            var leaf = new THREE.Mesh(leafGeo, lMat);
            leaf.visible = false;
            scene.add(leaf);
            this._leaves.push({
                mesh: leaf, life: 0, maxLife: 0,
                vx: 0, vy: 0, spin: 0, spinSpeed: 0,
                tumble: Math.random() * Math.PI * 2
            });
        }
        this._leafIdx = 0;

        // Wind line streaks (thin stretched boxes)
        this._windLines = [];
        for (var w = 0; w < 12; w++) {
            var wGeo = new THREE.BoxGeometry(0.2, 0.003, 0.002);
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xccddee, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wLine = new THREE.Mesh(wGeo, wMat);
            wLine.visible = false;
            scene.add(wLine);
            this._windLines.push({
                mesh: wLine, life: 0, maxLife: 0,
                vx: 0, startY: 0
            });
        }
        this._windIdx = 0;

        // Debris particles (small dots)
        this._debris = [];
        var debGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var d = 0; d < 15; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0x998877, transparent: true, opacity: 0,
                depthWrite: false
            });
            var deb = new THREE.Mesh(debGeo, dMat);
            deb.visible = false;
            scene.add(deb);
            this._debris.push({
                mesh: deb, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._debIdx = 0;

        // Gust wave indicators
        this._gustPhase = 0;
        this._gustWaves = [
            { start: 0.12, peak: 0.22, end: 0.35, strength: 0.7 },
            { start: 0.40, peak: 0.50, end: 0.62, strength: 1.0 },
            { start: 0.65, peak: 0.72, end: 0.82, strength: 0.85 }
        ];
    },
    _getGustStrength(progress) {
        var strength = 0;
        for (var g = 0; g < this._gustWaves.length; g++) {
            var gw = this._gustWaves[g];
            if (progress >= gw.start && progress <= gw.end) {
                var mid = gw.peak;
                if (progress < mid) {
                    strength = Math.max(strength, ((progress - gw.start) / (mid - gw.start)) * gw.strength);
                } else {
                    strength = Math.max(strength, ((gw.end - progress) / (gw.end - mid)) * gw.strength);
                }
            }
        }
        return strength;
    },
    _spawnLeaf(ox, oy, gustStr) {
        var l = this._leaves[this._leafIdx % this._leaves.length];
        this._leafIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(
            ox - 1.0 - Math.random() * 0.3,
            oy + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.1
        );
        l.vx = 1.0 + gustStr * 1.5 + Math.random() * 0.5;
        l.vy = (Math.random() - 0.5) * 0.4;
        l.life = 1.5 + Math.random() * 1.0;
        l.maxLife = l.life;
        l.spinSpeed = (Math.random() - 0.5) * 10;
        l.mesh.material.opacity = 0.7;
    },
    _spawnWindLine(ox, oy, gustStr) {
        var w = this._windLines[this._windIdx % this._windLines.length];
        this._windIdx++;
        w.mesh.visible = true;
        w.startY = oy + (Math.random() - 0.5) * 0.8;
        w.mesh.position.set(
            ox - 1.2,
            w.startY,
            0
        );
        w.vx = 2.0 + gustStr * 2.0;
        w.life = 0.4 + Math.random() * 0.3;
        w.maxLife = w.life;
        w.mesh.scale.set(1 + gustStr * 2, 1, 1);
        w.mesh.material.opacity = 0.3 * gustStr;
    },
    _spawnDebris(ox, oy, gustStr) {
        var d = this._debris[this._debIdx % this._debris.length];
        this._debIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(
            ox - 0.8 + Math.random() * 0.3,
            oy - 0.3 + Math.random() * 0.2,
            0
        );
        d.vx = 0.5 + gustStr * 1.0;
        d.vy = 0.1 + Math.random() * 0.3;
        d.life = 0.5 + Math.random() * 0.4;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        var gustStr = this._getGustStrength(progress);
        var isCalm = gustStr < 0.1;

        // Phase: Calm before storm (0-12%)
        if (progress < 0.12) {
            model.position.set(ox, oy, oz);
        }
        // During gust phases: model leans, particles blow
        else if (progress < 0.85) {
            // Model leans against wind
            var lean = gustStr * 0.08;
            var push = gustStr * 0.04;
            model.position.set(ox + push, oy, oz);
            model.rotation.z = -lean;

            // Spawn leaves during gusts
            if (gustStr > 0.2 && Math.random() < gustStr * 0.3) {
                this._spawnLeaf(ox, oy, gustStr);
            }

            // Spawn wind lines during gusts
            if (gustStr > 0.3 && Math.random() < gustStr * 0.2) {
                this._spawnWindLine(ox, oy, gustStr);
            }

            // Spawn debris
            if (gustStr > 0.4 && Math.random() < gustStr * 0.1) {
                this._spawnDebris(ox, oy, gustStr);
            }
        }
        // Settle phase (85-100%)
        else {
            var t5 = (progress - 0.85) / 0.15;
            model.position.set(
                ox + 0.04 * (1 - t5) * gustStr,
                oy,
                oz
            );
            model.rotation.z = -0.08 * gustStr * (1 - t5);

            if (t5 > 0.8) {
                model.position.copy(this._origPos);
                model.rotation.z = 0;
            }
        }

        // Update leaves
        for (var li = 0; li < this._leaves.length; li++) {
            var lf = this._leaves[li];
            if (lf.life <= 0) continue;
            lf.life -= delta;
            if (lf.life <= 0) { lf.mesh.visible = false; continue; }
            lf.mesh.position.x += lf.vx * delta;
            lf.mesh.position.y += lf.vy * delta;
            lf.vy += (Math.random() - 0.5) * delta * 2; // turbulence
            lf.tumble += lf.spinSpeed * delta;
            lf.mesh.rotation.z = lf.tumble;
            lf.mesh.rotation.x = Math.sin(lf.tumble * 0.7) * 0.5;
            lf.mesh.material.opacity = 0.7 * (lf.life / lf.maxLife);
        }

        // Update wind lines
        for (var wi = 0; wi < this._windLines.length; wi++) {
            var wl = this._windLines[wi];
            if (wl.life <= 0) continue;
            wl.life -= delta;
            if (wl.life <= 0) { wl.mesh.visible = false; continue; }
            wl.mesh.position.x += wl.vx * delta;
            wl.mesh.material.opacity = 0.3 * (wl.life / wl.maxLife);
        }

        // Update debris
        for (var di = 0; di < this._debris.length; di++) {
            var db = this._debris[di];
            if (db.life <= 0) continue;
            db.life -= delta;
            if (db.life <= 0) { db.mesh.visible = false; continue; }
            db.mesh.position.x += db.vx * delta;
            db.mesh.position.y += db.vy * delta;
            db.vy -= 1.5 * delta;
            db.mesh.material.opacity = 0.5 * (db.life / db.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._leaves) { this._leaves.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._windLines) { this._windLines.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._debris) { this._debris.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        this._leaves = this._windLines = this._debris = null;
    }
};