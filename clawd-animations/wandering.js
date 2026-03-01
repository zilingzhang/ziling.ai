export default {
    name: 'Wandering',
    label: 'wandering',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Footprint trail dots
        this._footprints = [];
        var fpGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var i = 0; i < 30; i++) {
            var fpMat = new THREE.MeshBasicMaterial({
                color: 0x55aa88, transparent: true, opacity: 0,
                depthWrite: false
            });
            var fp = new THREE.Mesh(fpGeo, fpMat);
            fp.visible = false;
            scene.add(fp);
            this._footprints.push({ mesh: fp, placed: false, fadeTimer: 0 });
        }
        this._fpIdx = 0;

        // Map particle (flat box that floats nearby but is ignored)
        var mapGeo = new THREE.BoxGeometry(0.12, 0.08, 0.005);
        var mapMat = new THREE.MeshBasicMaterial({
            color: 0xddccaa, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._map = new THREE.Mesh(mapGeo, mapMat);
        this._map.position.set(ox + 0.2, oy + 0.2, 0);
        scene.add(this._map);

        // Map lines (decorative)
        this._mapLines = [];
        for (var ml = 0; ml < 3; ml++) {
            var mlGeo = new THREE.BoxGeometry(0.08, 0.003, 0.006);
            var mlMat = new THREE.MeshBasicMaterial({
                color: 0xaa8866, transparent: true, opacity: 0,
                depthWrite: false
            });
            var mLine = new THREE.Mesh(mlGeo, mlMat);
            mLine.position.set(ox + 0.2, oy + 0.22 - ml * 0.025, 0.005);
            scene.add(mLine);
            this._mapLines.push(mLine);
        }

        // Discovery sparkles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var j = 0; j < 20; j++) {
            var spColors = [0x44ddaa, 0x66eebb, 0x88ffdd, 0x33ccaa, 0x55eebb];
            var spMat = new THREE.MeshBasicMaterial({
                color: spColors[j % spColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sp = new THREE.Mesh(spkGeo, spMat);
            sp.visible = false;
            scene.add(sp);
            this._sparkles.push({ mesh: sp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // Scenic overlook particles (panorama at viewpoint)
        this._scenicParts = [];
        var scGeo = new THREE.SphereGeometry(0.015, 6, 6);
        var scColors = [0x44bbaa, 0x66ddcc, 0x88eedd, 0xaaffee, 0x55ccbb,
                        0x77ddcc, 0x33aa99, 0x99ffee];
        for (var k = 0; k < 20; k++) {
            var scMat = new THREE.MeshBasicMaterial({
                color: scColors[k % scColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sc = new THREE.Mesh(scGeo, scMat);
            sc.visible = false;
            scene.add(sc);
            this._scenicParts.push(sc);
        }

        // Winding path waypoints
        this._waypoints = [
            { x: ox - 0.5, y: oy },
            { x: ox - 0.3, y: oy + 0.15 },
            { x: ox - 0.1, y: oy - 0.1 },
            { x: ox + 0.1, y: oy + 0.1 },
            { x: ox + 0.3, y: oy - 0.05 },
            { x: ox + 0.5, y: oy + 0.15 },
            { x: ox + 0.4, y: oy + 0.2 }  // Scenic overlook
        ];

        this._lastFp = 0;
        this._lastSparkle = 0;
        this._discoveryPoints = [
            { x: ox - 0.2, y: oy + 0.05, found: false },
            { x: ox + 0.15, y: oy - 0.02, found: false },
            { x: ox + 0.35, y: oy + 0.08, found: false }
        ];
    },
    _emitSparkle(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._sparkles[this._spkIdx % this._sparkles.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y + (Math.random() - 0.5) * 0.08, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.8;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd + 0.3;
            s.vz = (Math.random() - 0.5) * 0.3;
            s.life = 0.5 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    _placeFootprint(x, y) {
        if (this._fpIdx >= this._footprints.length) return;
        var fp = this._footprints[this._fpIdx];
        this._fpIdx++;
        fp.mesh.visible = true;
        fp.mesh.position.set(x, y - 0.12, 0);
        fp.mesh.material.opacity = 0.4;
        fp.placed = true;
        fp.fadeTimer = 5.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var gs = this._origScale.x;

        // Fade old footprints
        for (var fi = 0; fi < this._footprints.length; fi++) {
            var fp = this._footprints[fi];
            if (fp.placed && fp.fadeTimer > 0) {
                fp.fadeTimer -= delta;
                if (fp.fadeTimer < 1.0) {
                    fp.mesh.material.opacity = 0.4 * fp.fadeTimer;
                }
                if (fp.fadeTimer <= 0) fp.mesh.visible = false;
            }
        }

        if (progress < 0.05) {
            // Appear
            var t = progress / 0.05;
            model.position.set(ox - 0.5, oy, oz);
            this._map.material.opacity = t * 0.4;
            for (var mli = 0; mli < this._mapLines.length; mli++) {
                this._mapLines[mli].material.opacity = t * 0.3;
            }
        } else if (progress < 0.70) {
            // Main wandering
            var t2 = (progress - 0.05) / 0.65;
            var wpCount = this._waypoints.length - 1; // Last is scenic overlook
            var wpFloat = t2 * wpCount;
            var wpIdx = Math.min(Math.floor(wpFloat), wpCount - 1);
            var wpT = wpFloat - wpIdx;

            var fromWp = this._waypoints[wpIdx];
            var toWp = this._waypoints[Math.min(wpIdx + 1, wpCount)];

            var wx = fromWp.x + (toWp.x - fromWp.x) * wpT;
            var wy = fromWp.y + (toWp.y - fromWp.y) * wpT;

            // Slow, ambling walk
            model.position.set(wx, wy + Math.sin(time * 3) * 0.01, oz);
            model.rotation.z = Math.sin(time * 2) * 0.03;

            // Gentle walk cycle
            var walkPhase = Math.sin(time * 3.5);
            if (walkPhase > 0.7) {
                model.scale.set(gs * 0.98, gs * 1.02, gs);
            } else {
                model.scale.setScalar(gs);
            }

            // Map floats nearby but ignored
            this._map.position.set(wx + 0.2 + Math.sin(time * 0.8) * 0.03, wy + 0.2 + Math.cos(time * 0.6) * 0.02, 0);
            this._map.rotation.z = Math.sin(time * 0.5) * 0.1;
            this._map.material.opacity = 0.4;
            for (var mlj = 0; mlj < this._mapLines.length; mlj++) {
                this._mapLines[mlj].position.set(
                    this._map.position.x,
                    this._map.position.y + 0.02 - mlj * 0.025,
                    0.005
                );
                this._mapLines[mlj].rotation.z = this._map.rotation.z;
                this._mapLines[mlj].material.opacity = 0.3;
            }

            // Footprints
            if (time - this._lastFp > 0.4) {
                this._placeFootprint(wx, wy);
                this._lastFp = time;
            }

            // Discovery sparkles at random spots
            for (var di = 0; di < this._discoveryPoints.length; di++) {
                var dp = this._discoveryPoints[di];
                var dd = Math.sqrt(Math.pow(dp.x - wx, 2) + Math.pow(dp.y - wy, 2));
                if (dd < 0.15 && !dp.found) {
                    dp.found = true;
                    this._emitSparkle(dp.x, dp.y);
                }
            }
        } else if (progress < 0.85) {
            // Scenic overlook pause
            var t3 = (progress - 0.70) / 0.15;
            var overlook = this._waypoints[this._waypoints.length - 1];

            model.position.set(overlook.x, overlook.y, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Map fades away (not needed)
            this._map.material.opacity = 0.4 * (1 - t3);
            for (var mlk = 0; mlk < this._mapLines.length; mlk++) {
                this._mapLines[mlk].material.opacity = 0.3 * (1 - t3);
            }

            // Scenic panorama particles appear
            for (var si = 0; si < this._scenicParts.length; si++) {
                var sc = this._scenicParts[si];
                var scDelay = si * 0.04;
                if (t3 > scDelay) {
                    sc.visible = true;
                    var scT = Math.min(1, (t3 - scDelay) / 0.2);
                    var scAngle = (si / this._scenicParts.length) * Math.PI * 0.8 - Math.PI * 0.4;
                    var scR = 0.3 + si * 0.02;
                    sc.position.set(
                        overlook.x + Math.cos(scAngle) * scR,
                        overlook.y + 0.1 + Math.sin(scAngle * 0.5) * 0.1 + si * 0.008,
                        -0.01
                    );
                    sc.material.opacity = scT * 0.5;
                    sc.scale.setScalar(scT * (0.8 + Math.sin(time * 2 + si) * 0.1));
                }
            }
        } else {
            // Return and fade
            var t4 = (progress - 0.85) / 0.15;

            model.position.set(
                this._waypoints[this._waypoints.length - 1].x + (ox - this._waypoints[this._waypoints.length - 1].x) * t4,
                this._waypoints[this._waypoints.length - 1].y + (oy - this._waypoints[this._waypoints.length - 1].y) * t4,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var sj = 0; sj < this._scenicParts.length; sj++) {
                this._scenicParts[sj].material.opacity = 0.5 * (1 - t4);
            }
            this._map.material.opacity = 0;
        }

        // Update sparkles
        for (var ski = 0; ski < this._sparkles.length; ski++) {
            var spk = this._sparkles[ski];
            if (spk.life <= 0) continue;
            spk.life -= delta;
            if (spk.life <= 0) { spk.mesh.visible = false; continue; }
            spk.mesh.position.x += spk.vx * delta;
            spk.mesh.position.y += spk.vy * delta;
            spk.mesh.position.z += spk.vz * delta;
            spk.vy -= 0.5 * delta;
            spk.mesh.material.opacity = 0.8 * (spk.life / spk.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._footprints) {
            this._footprints.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); });
        }
        if (this._map) { scene.remove(this._map); this._map.geometry.dispose(); this._map.material.dispose(); }
        if (this._mapLines) {
            this._mapLines.forEach(function(m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._scenicParts) {
            this._scenicParts.forEach(function(s) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); });
        }
        this._footprints = this._map = this._mapLines = this._sparkles = this._scenicParts = null;
    }
};
