export default {
    name: 'Ebbing',
    label: 'ebbing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Wave particles
        this._waves = [];
        var waveGeo = new THREE.SphereGeometry(0.02, 5, 5);
        for (var i = 0; i < 40; i++) {
            var shade = Math.random();
            var color = shade < 0.33 ? 0x2266aa : (shade < 0.66 ? 0x3388cc : 0x55aadd);
            var wMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0, depthWrite: false
            });
            var wave = new THREE.Mesh(waveGeo, wMat);
            wave.visible = false;
            scene.add(wave);
            this._waves.push({
                mesh: wave,
                baseX: ox - 1.0 + (i % 10) * 0.2 + Math.random() * 0.1,
                baseY: oy - 0.4 + Math.floor(i / 10) * 0.05,
                phase: Math.random() * Math.PI * 2,
                speed: 0.8 + Math.random() * 0.5
            });
        }

        // Foam particles at wave edge
        this._foam = [];
        var foamGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var f = 0; f < 25; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xeeffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var foam = new THREE.Mesh(foamGeo, fMat);
            foam.visible = false;
            scene.add(foam);
            this._foam.push({
                mesh: foam, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._foamIdx = 0;

        // Beach/sand strip
        var sandGeo = new THREE.BoxGeometry(2.0, 0.06, 0.3);
        var sandMat = new THREE.MeshBasicMaterial({
            color: 0xddcc99, transparent: true, opacity: 0
        });
        this._sand = new THREE.Mesh(sandGeo, sandMat);
        this._sand.position.set(ox, oy - 0.5, -0.05);
        scene.add(this._sand);

        // Shells left on beach
        this._shells = [];
        var shellColors = [0xeeddbb, 0xffeecc, 0xddccaa, 0xccbbaa];
        for (var sh = 0; sh < 5; sh++) {
            var shGeo = new THREE.SphereGeometry(0.018, 5, 3);
            var shMat = new THREE.MeshBasicMaterial({
                color: shellColors[sh % shellColors.length],
                transparent: true, opacity: 0
            });
            var shell = new THREE.Mesh(shGeo, shMat);
            shell.position.set(
                ox - 0.3 + sh * 0.15 + Math.random() * 0.05,
                oy - 0.48,
                0
            );
            shell.scale.set(1, 0.6, 1);
            shell.visible = false;
            scene.add(shell);
            this._shells.push({ mesh: shell });
        }

        // Water level indicator (horizontal blue disc)
        var waterGeo = new THREE.PlaneGeometry(2.0, 0.4);
        var waterMat = new THREE.MeshBasicMaterial({
            color: 0x2277bb, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._waterPlane = new THREE.Mesh(waterGeo, waterMat);
        this._waterPlane.position.set(ox, oy - 0.35, -0.02);
        scene.add(this._waterPlane);

        this._tidePhase = 0;
    },
    _spawnFoam(x, y) {
        var f = this._foam[this._foamIdx % this._foam.length];
        this._foamIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        f.vx = (Math.random() - 0.5) * 0.15;
        f.vy = Math.random() * 0.05;
        f.life = 0.4 + Math.random() * 0.3;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Tide cycle: advance and retreat rhythmically
        this._tidePhase = time * 0.8;
        var tideCycle = Math.sin(this._tidePhase);
        var tideOffset = tideCycle * 0.25; // how far waves advance

        var intensity = 0;
        var shellsVisible = false;

        // Phase 1: Ocean appears (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            intensity = t;
            this._sand.material.opacity = t * 0.5;
            this._waterPlane.material.opacity = t * 0.15;
        }
        // Phase 2: Waves advancing and retreating (10-50%)
        else if (progress < 0.50) {
            var t2 = (progress - 0.10) / 0.40;
            intensity = 0.6 + t2 * 0.4;
            this._sand.material.opacity = 0.5;
            this._waterPlane.material.opacity = 0.15 + tideCycle * 0.05;

            // Water level rises and falls
            this._waterPlane.position.y = oy - 0.35 + tideOffset * 0.15;
        }
        // Phase 3: High tide with strong waves (50-70%)
        else if (progress < 0.70) {
            intensity = 1.0;
            this._sand.material.opacity = 0.5;
            this._waterPlane.material.opacity = 0.2 + tideCycle * 0.05;
            this._waterPlane.position.y = oy - 0.30 + tideOffset * 0.1;
        }
        // Phase 4: Tide ebbs, shells revealed (70-88%)
        else if (progress < 0.88) {
            var t4 = (progress - 0.70) / 0.18;
            intensity = 1.0 - t4 * 0.5;
            shellsVisible = true;
            this._waterPlane.position.y = oy - 0.35 - t4 * 0.1;
            this._waterPlane.material.opacity = (0.2 - t4 * 0.1) + tideCycle * 0.03;
        }
        // Phase 5: Fade out (88-100%)
        else {
            var t5 = (progress - 0.88) / 0.12;
            intensity = 0.5 * (1 - t5);
            shellsVisible = true;
            this._sand.material.opacity = 0.5 * (1 - t5);
            this._waterPlane.material.opacity = 0.1 * (1 - t5);

            // Shells fade
            for (var sh2 = 0; sh2 < this._shells.length; sh2++) {
                this._shells[sh2].mesh.material.opacity = 0.6 * (1 - t5);
            }

            model.position.set(
                ox + Math.sin(this._tidePhase) * 0.01 * (1 - t5),
                oy,
                oz
            );
            if (t5 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update wave particles
        for (var i = 0; i < this._waves.length; i++) {
            var w = this._waves[i];
            if (intensity <= 0) { w.mesh.visible = false; continue; }
            w.mesh.visible = true;
            // Waves advance/retreat with tide
            var waveX = w.baseX + tideOffset + Math.sin(time * w.speed + w.phase) * 0.08;
            var waveY = w.baseY + Math.sin(time * 1.5 + w.phase) * 0.03;
            w.mesh.position.set(waveX, waveY, 0);
            w.mesh.material.opacity = intensity * 0.5;
            w.mesh.scale.setScalar(0.8 + Math.sin(time * 2 + w.phase) * 0.3);

            // Spawn foam at leading edge
            if (tideCycle > 0.5 && Math.random() < 0.02 * intensity) {
                this._spawnFoam(waveX, waveY + 0.02);
            }
        }

        // Shells appear at low tide
        for (var sh = 0; sh < this._shells.length; sh++) {
            if (shellsVisible) {
                this._shells[sh].mesh.visible = true;
                this._shells[sh].mesh.material.opacity = Math.min(this._shells[sh].mesh.material.opacity + delta * 2, 0.6);
            }
        }

        // Model sways with tide
        if (progress < 0.88) {
            var sway = Math.sin(this._tidePhase) * 0.03 * intensity;
            var bob = Math.sin(this._tidePhase * 1.3) * 0.01 * intensity;
            model.position.set(ox + sway, oy + bob, oz);
            model.rotation.z = sway * 0.5;
        }

        // Update foam
        for (var fi = 0; fi < this._foam.length; fi++) {
            var ff = this._foam[fi];
            if (ff.life <= 0) continue;
            ff.life -= delta;
            if (ff.life <= 0) { ff.mesh.visible = false; continue; }
            ff.mesh.position.x += ff.vx * delta;
            ff.mesh.position.y += ff.vy * delta;
            ff.mesh.material.opacity = 0.6 * (ff.life / ff.maxLife);
            ff.mesh.scale.setScalar(0.8 + (1 - ff.life / ff.maxLife) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._waves) { this._waves.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._foam) { this._foam.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._sand) { scene.remove(this._sand); this._sand.geometry.dispose(); this._sand.material.dispose(); }
        if (this._shells) { this._shells.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._waterPlane) { scene.remove(this._waterPlane); this._waterPlane.geometry.dispose(); this._waterPlane.material.dispose(); }
        this._waves = this._foam = this._sand = this._shells = this._waterPlane = null;
    }
};