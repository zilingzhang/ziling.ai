export default {
    name: 'Unfurling',
    label: 'unfurling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Scroll/flag segments (many thin vertical strips side by side)
        this._scrollSegments = [];
        var segGeo = new THREE.BoxGeometry(0.02, 0.25, 0.005);
        for (var i = 0; i < 30; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x8833cc : (i % 3 === 1 ? 0xaa44dd : 0xcc55ee),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var seg = new THREE.Mesh(segGeo, sMat);
            seg.visible = false;
            scene.add(seg);
            this._scrollSegments.push({
                mesh: seg,
                idx: i,
                unrolled: false,
                targetX: ox - 0.3 + i * 0.02,
                rollAngle: 0
            });
        }

        // Roll core (cylinder representing the tight roll)
        var rollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10);
        var rollMat = new THREE.MeshBasicMaterial({
            color: 0x9944cc, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._roll = new THREE.Mesh(rollGeo, rollMat);
        this._roll.rotation.z = Math.PI * 0.5;
        this._roll.position.set(ox - 0.35, oy, 0);
        scene.add(this._roll);

        // Glowing surface (revealed content)
        var surfGeo = new THREE.PlaneGeometry(0.6, 0.25);
        var surfMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._surface = new THREE.Mesh(surfGeo, surfMat);
        this._surface.position.set(ox, oy, -0.01);
        this._surface.scale.x = 0.01;
        scene.add(this._surface);

        // Wind particles
        this._windParts = [];
        var windGeo = new THREE.BoxGeometry(0.06, 0.003, 0.003);
        for (var j = 0; j < 15; j++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xccccff : 0xaaaadd,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wind = new THREE.Mesh(windGeo, wMat);
            wind.visible = false;
            scene.add(wind);
            this._windParts.push({
                mesh: wind, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._windIdx = 0;

        // Ripple wave particles (along the surface)
        this._ripples = [];
        var ripGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var k = 0; k < 15; k++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0xffdd66 : 0xffaa33,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rip = new THREE.Mesh(ripGeo, rMat);
            rip.visible = false;
            scene.add(rip);
            this._ripples.push({
                mesh: rip, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._ripIdx = 0;

        // Snap energy burst
        var snapGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var snapMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._snap = new THREE.Mesh(snapGeo, snapMat);
        this._snap.position.set(ox + 0.3, oy, 0);
        scene.add(this._snap);

        // Fabric ripple particles
        this._fabricParts = [];
        var fabGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var f = 0; f < 12; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: f % 2 === 0 ? 0xcc55ee : 0xffcc44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fab = new THREE.Mesh(fabGeo, fMat);
            fab.visible = false;
            scene.add(fab);
            this._fabricParts.push({
                mesh: fab, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._fabIdx = 0;

        this._unrollProgress = 0;
    },
    _spawnWind(x, y) {
        var w = this._windParts[this._windIdx % this._windParts.length];
        this._windIdx++;
        w.mesh.visible = true;
        w.mesh.position.set(x - 0.3, y + (Math.random() - 0.5) * 0.2, 0.02);
        w.vx = 1.5 + Math.random() * 1.0;
        w.vy = (Math.random() - 0.5) * 0.2;
        w.life = 0.3 + Math.random() * 0.2;
        w.maxLife = w.life;
        w.mesh.material.opacity = 0.5;
    },
    _spawnRipple(x, y) {
        var r = this._ripples[this._ripIdx % this._ripples.length];
        this._ripIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0.01);
        r.vx = 0.8 + Math.random() * 0.5;
        r.vy = (Math.random() - 0.5) * 0.3;
        r.life = 0.3 + Math.random() * 0.2;
        r.maxLife = r.life;
        r.mesh.material.opacity = 0.6;
    },
    _spawnFabric(x, y) {
        var f = this._fabricParts[this._fabIdx % this._fabricParts.length];
        this._fabIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y, 0.02);
        var angle = Math.random() * Math.PI * 2;
        f.vx = Math.cos(angle) * 0.5;
        f.vy = Math.sin(angle) * 0.5;
        f.life = 0.3 + Math.random() * 0.2;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Tight roll appears
            var t = progress / 0.08;
            this._roll.material.opacity = t * 0.6;
            this._roll.scale.setScalar(0.5 + t * 0.5);
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.55) {
            // Phase 2: Unrolling, segments reveal one by one
            var t2 = (progress - 0.08) / 0.47;
            this._unrollProgress = t2;

            // Roll shrinks as it unrolls
            this._roll.material.opacity = 0.6;
            this._roll.scale.x = 1;
            this._roll.scale.y = 1;
            this._roll.scale.z = 1 - t2 * 0.7;
            this._roll.position.x = ox - 0.35 + t2 * 0.6;

            // Reveal segments
            var revealCount = Math.floor(t2 * 30);
            for (var i = 0; i < this._scrollSegments.length; i++) {
                var seg = this._scrollSegments[i];
                if (i < revealCount) {
                    seg.mesh.visible = true;
                    seg.unrolled = true;
                    seg.mesh.position.set(seg.targetX, oy, 0);
                    // Ripple wave effect
                    var waveOffset = Math.sin(time * 6 - i * 0.3) * 0.01;
                    seg.mesh.position.y = oy + waveOffset;
                    seg.mesh.material.opacity = 0.5;
                }
            }

            // Glowing surface reveals
            this._surface.scale.x = Math.max(0.01, t2);
            this._surface.material.opacity = t2 * 0.2;

            // Wind starts
            if (t2 > 0.3 && Math.random() < 0.08) {
                this._spawnWind(ox, oy);
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 2) * 0.008, oz);
        } else if (progress < 0.75) {
            // Phase 3: Wind catches it, ripple waves
            var t3 = (progress - 0.55) / 0.20;
            this._unrollProgress = 1;

            // Roll almost gone
            this._roll.material.opacity = 0.6 * (1 - t3);
            this._roll.scale.z = 0.3 * (1 - t3);

            // All segments visible with wave ripple
            for (var j = 0; j < this._scrollSegments.length; j++) {
                var seg2 = this._scrollSegments[j];
                seg2.mesh.visible = true;
                var wave = Math.sin(time * 8 - j * 0.4) * (0.01 + t3 * 0.02);
                seg2.mesh.position.y = oy + wave;
                seg2.mesh.material.opacity = 0.5 + Math.sin(time * 4 + j * 0.2) * 0.1;
            }

            this._surface.scale.x = 1;
            this._surface.material.opacity = 0.2 + t3 * 0.1;

            // Wind and ripples
            if (Math.random() < 0.12) {
                this._spawnWind(ox, oy);
            }
            if (Math.random() < 0.08) {
                this._spawnRipple(ox - 0.3, oy + (Math.random() - 0.5) * 0.1);
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 3) * 0.01, oz);
        } else if (progress < 0.88) {
            // Phase 4: Full extension with dramatic snap
            var t4 = (progress - 0.75) / 0.13;
            var snapEase = Math.sin(t4 * Math.PI);

            // Snap effect
            this._snap.material.opacity = snapEase * 0.3;
            this._snap.scale.setScalar(1 + snapEase * 1.5);

            // Segments snap taut
            for (var k = 0; k < this._scrollSegments.length; k++) {
                var seg3 = this._scrollSegments[k];
                var snapWave = Math.sin(time * 12 - k * 0.5) * 0.005 * (1 - t4);
                seg3.mesh.position.y = oy + snapWave;
                seg3.mesh.material.opacity = 0.5 + snapEase * 0.2;
            }

            this._surface.material.opacity = 0.3 + snapEase * 0.15;

            // Fabric particles at snap moment
            if (t4 < 0.2) {
                this._spawnFabric(ox + 0.3, oy);
            }

            this._roll.material.opacity = 0;

            model.position.set(ox + 0.2, oy, oz);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.88) / 0.12;
            for (var m = 0; m < this._scrollSegments.length; m++) {
                this._scrollSegments[m].mesh.material.opacity = 0.5 * (1 - t5);
            }
            this._surface.material.opacity = 0.3 * (1 - t5);
            this._snap.material.opacity = 0;

            model.position.set(ox + 0.2 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update wind
        for (var wi = 0; wi < this._windParts.length; wi++) {
            var wp = this._windParts[wi];
            if (wp.life <= 0) continue;
            wp.life -= delta;
            if (wp.life <= 0) { wp.mesh.visible = false; continue; }
            wp.mesh.position.x += wp.vx * delta;
            wp.mesh.position.y += wp.vy * delta;
            var wlr = wp.life / wp.maxLife;
            wp.mesh.material.opacity = wlr * 0.4;
        }

        // Update ripples
        for (var ri = 0; ri < this._ripples.length; ri++) {
            var rp = this._ripples[ri];
            if (rp.life <= 0) continue;
            rp.life -= delta;
            if (rp.life <= 0) { rp.mesh.visible = false; continue; }
            rp.mesh.position.x += rp.vx * delta;
            rp.mesh.position.y += rp.vy * delta;
            var rlr = rp.life / rp.maxLife;
            rp.mesh.material.opacity = rlr * 0.5;
        }

        // Update fabric particles
        for (var fi = 0; fi < this._fabricParts.length; fi++) {
            var fp = this._fabricParts[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.mesh.position.x += fp.vx * delta;
            fp.mesh.position.y += fp.vy * delta;
            var flr = fp.life / fp.maxLife;
            fp.mesh.material.opacity = flr * 0.5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._scrollSegments) { this._scrollSegments.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._roll) { scene.remove(this._roll); this._roll.geometry.dispose(); this._roll.material.dispose(); }
        if (this._surface) { scene.remove(this._surface); this._surface.geometry.dispose(); this._surface.material.dispose(); }
        if (this._windParts) { this._windParts.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._ripples) { this._ripples.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._snap) { scene.remove(this._snap); this._snap.geometry.dispose(); this._snap.material.dispose(); }
        if (this._fabricParts) { this._fabricParts.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        this._scrollSegments = this._roll = this._surface = this._windParts = this._ripples = this._snap = this._fabricParts = null;
    }
};
