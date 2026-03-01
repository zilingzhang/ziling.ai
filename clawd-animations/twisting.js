export default {
    name: 'Twisting',
    label: 'twisting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // DNA strand particles (two intertwined spirals)
        this._strand1 = [];
        this._strand2 = [];
        var strandGeo = new THREE.SphereGeometry(0.02, 5, 5);
        for (var i = 0; i < 20; i++) {
            var s1Mat = new THREE.MeshBasicMaterial({
                color: 0x8844ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var s2Mat = new THREE.MeshBasicMaterial({
                color: 0x4488ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var s1 = new THREE.Mesh(strandGeo, s1Mat);
            var s2 = new THREE.Mesh(strandGeo, s2Mat);
            scene.add(s1); scene.add(s2);
            this._strand1.push({ mesh: s1, t: i / 20 });
            this._strand2.push({ mesh: s2, t: i / 20 });
        }

        // Rung connections (bars between strands)
        this._rungs = [];
        var rungGeo = new THREE.BoxGeometry(0.08, 0.006, 0.006);
        for (var j = 0; j < 10; j++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xaa66ff : 0x66aaff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rung = new THREE.Mesh(rungGeo, rMat);
            scene.add(rung);
            this._rungs.push({ mesh: rung, t: j / 10 });
        }

        // Strand trail particles
        this._trails = [];
        var trailGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var k = 0; k < 20; k++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0x8844ff : 0x4488ff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._trails.push({
                mesh: trail, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._trIdx = 0;

        // Energy burst sphere (for spring-back)
        var burstGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var burstMat = new THREE.MeshBasicMaterial({
            color: 0xaa88ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._burst = new THREE.Mesh(burstGeo, burstMat);
        this._burst.position.set(ox, oy, 0);
        scene.add(this._burst);

        // Twist glow
        var twistGlowGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
        var twistGlowMat = new THREE.MeshBasicMaterial({
            color: 0x7766ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._twistGlow = new THREE.Mesh(twistGlowGeo, twistGlowMat);
        this._twistGlow.position.set(ox, oy, -0.05);
        scene.add(this._twistGlow);

        this._twistAngle = 0;
        this._twistTightness = 1;
        this._stretchY = 0;
    },
    _spawnTrail(x, y) {
        var t = this._trails[this._trIdx % this._trails.length];
        this._trIdx++;
        t.mesh.visible = true;
        t.mesh.position.set(x, y, 0);
        t.vx = (Math.random() - 0.5) * 0.3;
        t.vy = (Math.random() - 0.5) * 0.3;
        t.life = 0.3 + Math.random() * 0.2;
        t.maxLife = t.life;
        t.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Strands appear
            var t = progress / 0.10;
            this._twistAngle = time * 2;
            this._twistTightness = 1;
            this._stretchY = 0;

            for (var i = 0; i < this._strand1.length; i++) {
                this._strand1[i].mesh.material.opacity = t * 0.5;
                this._strand2[i].mesh.material.opacity = t * 0.5;
            }
            for (var j = 0; j < this._rungs.length; j++) {
                this._rungs[j].mesh.material.opacity = t * 0.3;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Model rotates, twist begins
            var t2 = (progress - 0.10) / 0.30;
            this._twistAngle = time * 3;
            this._twistTightness = 1 + t2 * 2;
            this._stretchY = t2 * 0.15;

            model.rotation.z = time * 2 * t2;
            model.position.set(ox, oy + this._stretchY * 0.3, oz);

            this._twistGlow.material.opacity = t2 * 0.1;
        } else if (progress < 0.65) {
            // Phase 3: Twist tightens, stretch vertically
            var t3 = (progress - 0.40) / 0.25;
            this._twistAngle = time * 5;
            this._twistTightness = 3 + t3 * 3;
            this._stretchY = 0.15 + t3 * 0.15;

            model.rotation.z = time * 3;
            model.position.set(ox, oy + this._stretchY * 0.5, oz);
            model.scale.copy(this._origScale).multiplyScalar(1 + t3 * 0.05);

            this._twistGlow.material.opacity = 0.1 + t3 * 0.1;
            this._twistGlow.scale.y = 1 + this._stretchY * 2;

            // Trail particles
            if (Math.random() < 0.15) {
                this._spawnTrail(
                    ox + Math.sin(this._twistAngle) * 0.1,
                    oy + (Math.random() - 0.5) * 0.4
                );
            }
        } else if (progress < 0.78) {
            // Phase 4: Spring-back release with energy burst
            var t4 = (progress - 0.65) / 0.13;
            var releaseEase = Math.sin(t4 * Math.PI);

            this._twistTightness = 6 * (1 - t4 * 0.7);
            this._stretchY = 0.3 * (1 - t4);
            this._twistAngle = time * (5 - t4 * 3);

            // Spring-back: model snaps back
            model.rotation.z = time * 3 * (1 - t4) + Math.sin(time * 15) * 0.1 * (1 - t4);
            model.position.set(ox, oy + this._stretchY * 0.5, oz);

            // Energy burst
            this._burst.material.opacity = releaseEase * 0.35;
            this._burst.scale.setScalar(1 + releaseEase * 1.5);

            this._twistGlow.material.opacity = 0.2 * (1 - t4);

            // Burst particles
            if (t4 < 0.3) {
                for (var bi = 0; bi < 2; bi++) {
                    this._spawnTrail(
                        ox + (Math.random() - 0.5) * 0.2,
                        oy + (Math.random() - 0.5) * 0.2
                    );
                }
            }
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.78) / 0.22;
            this._twistTightness = 2 * (1 - t5) + 1;
            this._twistAngle = time * 2 * (1 - t5);
            this._stretchY = 0;

            for (var fi = 0; fi < this._strand1.length; fi++) {
                this._strand1[fi].mesh.material.opacity = 0.5 * (1 - t5);
                this._strand2[fi].mesh.material.opacity = 0.5 * (1 - t5);
            }
            for (var fj = 0; fj < this._rungs.length; fj++) {
                this._rungs[fj].mesh.material.opacity = 0.3 * (1 - t5);
            }

            this._burst.material.opacity *= 0.9;
            this._twistGlow.material.opacity = 0;

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update DNA strand positions
        var helixRadius = 0.08;
        var helixHeight = 0.5 + this._stretchY;
        for (var si = 0; si < this._strand1.length; si++) {
            var sT = this._strand1[si].t;
            var angle = sT * Math.PI * 2 * this._twistTightness + this._twistAngle;
            var yPos = oy - helixHeight * 0.5 + sT * helixHeight;

            this._strand1[si].mesh.position.set(
                ox + Math.cos(angle) * helixRadius,
                yPos,
                Math.sin(angle) * 0.03
            );
            this._strand2[si].mesh.position.set(
                ox + Math.cos(angle + Math.PI) * helixRadius,
                yPos,
                Math.sin(angle + Math.PI) * 0.03
            );
        }

        // Update rungs
        for (var ri = 0; ri < this._rungs.length; ri++) {
            var rT = this._rungs[ri].t;
            var rAngle = rT * Math.PI * 2 * this._twistTightness + this._twistAngle;
            var rY = oy - helixHeight * 0.5 + rT * helixHeight;
            var p1x = ox + Math.cos(rAngle) * helixRadius;
            var p2x = ox + Math.cos(rAngle + Math.PI) * helixRadius;
            this._rungs[ri].mesh.position.set((p1x + p2x) * 0.5, rY, 0);
            this._rungs[ri].mesh.rotation.z = rAngle;
            this._rungs[ri].mesh.scale.x = 1 + Math.abs(Math.sin(rAngle)) * 0.5;
        }

        // Update trail particles
        for (var ti = 0; ti < this._trails.length; ti++) {
            var tp = this._trails[ti];
            if (tp.life <= 0) continue;
            tp.life -= delta;
            if (tp.life <= 0) { tp.mesh.visible = false; continue; }
            tp.mesh.position.x += tp.vx * delta;
            tp.mesh.position.y += tp.vy * delta;
            var lr = tp.life / tp.maxLife;
            tp.mesh.material.opacity = lr * 0.4;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._strand1) { this._strand1.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._strand2) { this._strand2.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._rungs) { this._rungs.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._trails) { this._trails.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._burst) { scene.remove(this._burst); this._burst.geometry.dispose(); this._burst.material.dispose(); }
        if (this._twistGlow) { scene.remove(this._twistGlow); this._twistGlow.geometry.dispose(); this._twistGlow.material.dispose(); }
        this._strand1 = this._strand2 = this._rungs = this._trails = this._burst = this._twistGlow = null;
    }
};
