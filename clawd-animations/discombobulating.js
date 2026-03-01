export default {
    name: 'Discombobulating',
    label: 'discombobulating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 10 varied shape parts (same as combobulating, starts assembled)
        this._parts = [];
        var geos = [
            new THREE.BoxGeometry(0.06, 0.06, 0.06),
            new THREE.SphereGeometry(0.035, 6, 6),
            new THREE.ConeGeometry(0.035, 0.07, 5),
            new THREE.BoxGeometry(0.05, 0.08, 0.05),
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.ConeGeometry(0.04, 0.06, 4),
            new THREE.BoxGeometry(0.07, 0.05, 0.06),
            new THREE.SphereGeometry(0.04, 6, 6),
            new THREE.ConeGeometry(0.03, 0.08, 6),
            new THREE.BoxGeometry(0.055, 0.055, 0.055)
        ];
        var partColors = [0x44aaff, 0xff6644, 0x44ff88, 0xffaa22, 0xaa44ff,
                          0xff44aa, 0x22ddff, 0xffdd44, 0x66ff66, 0xff8866];

        // Grid positions (assembled state)
        for (var i = 0; i < 10; i++) {
            var row = Math.floor(i / 5);
            var col = i % 5;
            var gridX = ox - 0.5 + col * 0.11;
            var gridY = oy - 0.15 + row * 0.12;

            var mat = new THREE.MeshBasicMaterial({
                color: partColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mesh = new THREE.Mesh(geos[i], mat);
            mesh.position.set(gridX, gridY, 0);
            scene.add(mesh);

            // Random explosion direction
            var expAngle = Math.random() * Math.PI * 2;
            var expSpeed = 1.5 + Math.random() * 2.5;

            this._parts.push({
                mesh: mesh,
                gridX: gridX,
                gridY: gridY,
                vx: Math.cos(expAngle) * expSpeed,
                vy: Math.sin(expAngle) * expSpeed,
                vz: (Math.random() - 0.5) * 1.5,
                spinX: (Math.random() - 0.5) * 12,
                spinY: (Math.random() - 0.5) * 12,
                spinZ: (Math.random() - 0.5) * 12,
                // Current scattered position (updated during explosion)
                curX: gridX,
                curY: gridY,
                curZ: 0
            });
        }

        // Confusion stars (yellow, erratic orbit)
        this._stars = [];
        var starGeo = new THREE.OctahedronGeometry(0.025, 0);
        for (var j = 0; j < 8; j++) {
            var starMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xffff44 : 0xffdd00, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var star = new THREE.Mesh(starGeo, starMat);
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                orbitAngle: (Math.PI * 2 / 8) * j,
                orbitRadius: 0.2 + Math.random() * 0.15,
                orbitSpeed: 3 + Math.random() * 3,
                wobbleFreq: 5 + Math.random() * 5,
                wobbleAmp: 0.05 + Math.random() * 0.08
            });
        }

        // Explosion flash
        var flashGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(ox - 0.25, oy - 0.09, 0);
        scene.add(this._flash);

        this._exploded = false;
        this._explodeTime = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Neat structure visible, fade in
            var t = progress / 0.08;
            for (var i = 0; i < this._parts.length; i++) {
                this._parts[i].mesh.material.opacity = t * 0.8;
                this._parts[i].mesh.position.set(this._parts[i].gridX, this._parts[i].gridY, 0);
                this._parts[i].mesh.rotation.set(0, 0, 0);
            }
        } else if (progress < 0.25) {
            // Phase 2: EXPLOSION! Parts fly outward
            var t2 = (progress - 0.08) / 0.17;

            if (!this._exploded) {
                this._exploded = true;
                this._explodeTime = time;
            }

            // Flash
            if (t2 < 0.2) {
                this._flash.material.opacity = (1 - t2 / 0.2) * 0.7;
                this._flash.scale.setScalar(1 + t2 * 8);
            } else {
                this._flash.material.opacity = 0;
            }

            // Parts fly with physics
            var elapsed = time - this._explodeTime;
            for (var j = 0; j < this._parts.length; j++) {
                var p = this._parts[j];
                p.curX = p.gridX + p.vx * elapsed;
                p.curY = p.gridY + p.vy * elapsed - 0.5 * elapsed * elapsed;
                p.curZ = p.vz * elapsed;
                p.mesh.position.set(p.curX, p.curY, p.curZ);
                p.mesh.rotation.x += p.spinX * delta;
                p.mesh.rotation.y += p.spinY * delta;
                p.mesh.rotation.z += p.spinZ * delta;
                p.mesh.material.opacity = 0.8;
            }

            // Model recoils from explosion
            model.position.set(ox + t2 * 0.1, oy + Math.sin(t2 * Math.PI) * 0.05, oz);
            model.rotation.z = -t2 * 0.1;

            // Show confusion stars
            for (var k = 0; k < this._stars.length; k++) {
                var st = this._stars[k];
                st.mesh.visible = true;
                st.mesh.material.opacity = t2 * 0.6;
            }
        } else if (progress < 0.55) {
            // Phase 3: Maximum chaos, spinning parts, confusion stars orbit
            var t3 = (progress - 0.25) / 0.30;
            this._flash.material.opacity = 0;

            // Parts drift chaotically
            for (var m = 0; m < this._parts.length; m++) {
                var p2 = this._parts[m];
                // Slow drifting with wobble
                p2.mesh.position.x += Math.sin(time * 2 + m * 1.3) * 0.003;
                p2.mesh.position.y += Math.cos(time * 1.7 + m * 0.9) * 0.003;
                p2.mesh.rotation.x += p2.spinX * delta * 0.5;
                p2.mesh.rotation.y += p2.spinY * delta * 0.5;
                p2.mesh.rotation.z += p2.spinZ * delta * 0.5;
                // Update cur positions for later
                p2.curX = p2.mesh.position.x;
                p2.curY = p2.mesh.position.y;
                p2.curZ = p2.mesh.position.z;
            }

            // Model wobbles in confusion
            model.position.set(
                ox + Math.sin(time * 3) * 0.04,
                oy + Math.cos(time * 2.3) * 0.03,
                oz
            );
            model.rotation.z = Math.sin(time * 4) * 0.08;

            // Confusion stars orbit erratically around model
            for (var n = 0; n < this._stars.length; n++) {
                var st2 = this._stars[n];
                var starAngle = st2.orbitAngle + time * st2.orbitSpeed;
                var wobX = Math.sin(time * st2.wobbleFreq + n) * st2.wobbleAmp;
                var wobY = Math.cos(time * st2.wobbleFreq * 0.7 + n) * st2.wobbleAmp;
                st2.mesh.position.set(
                    model.position.x + Math.cos(starAngle) * st2.orbitRadius + wobX,
                    model.position.y + Math.sin(starAngle) * st2.orbitRadius + wobY,
                    0
                );
                st2.mesh.rotation.z += delta * 5;
                st2.mesh.material.opacity = 0.5 + Math.sin(time * 8 + n) * 0.2;
            }
        } else if (progress < 0.75) {
            // Phase 4: Parts slow, start drifting back
            var t4 = (progress - 0.55) / 0.20;
            var easeBack = t4 * t4;

            for (var q = 0; q < this._parts.length; q++) {
                var p3 = this._parts[q];
                p3.mesh.position.x = p3.curX + (p3.gridX - p3.curX) * easeBack * 0.5;
                p3.mesh.position.y = p3.curY + (p3.gridY - p3.curY) * easeBack * 0.5;
                p3.mesh.position.z = p3.curZ * (1 - easeBack * 0.5);
                // Slow spin
                p3.mesh.rotation.x += p3.spinX * delta * (1 - easeBack) * 0.3;
                p3.mesh.rotation.y += p3.spinY * delta * (1 - easeBack) * 0.3;
                p3.mesh.rotation.z += p3.spinZ * delta * (1 - easeBack) * 0.3;
            }

            // Stars fade
            for (var r = 0; r < this._stars.length; r++) {
                var st3 = this._stars[r];
                var starAngle2 = st3.orbitAngle + time * st3.orbitSpeed * (1 - easeBack * 0.5);
                st3.mesh.position.set(
                    model.position.x + Math.cos(starAngle2) * st3.orbitRadius,
                    model.position.y + Math.sin(starAngle2) * st3.orbitRadius,
                    0
                );
                st3.mesh.material.opacity = 0.5 * (1 - easeBack);
            }

            model.position.set(
                ox + Math.sin(time * 2) * 0.02 * (1 - easeBack),
                oy,
                oz
            );
            model.rotation.z = Math.sin(time * 3) * 0.04 * (1 - easeBack);
        } else if (progress < 0.90) {
            // Phase 5: Wobbly reassembly
            var t5 = (progress - 0.75) / 0.15;
            var easeAssemble = t5 * t5 * (3 - 2 * t5); // smoothstep

            for (var s = 0; s < this._parts.length; s++) {
                var p4 = this._parts[s];
                // Move toward grid, but wobbly
                var wobbleAmt = (1 - easeAssemble) * 0.03;
                var wx = Math.sin(time * 6 + s * 2) * wobbleAmt;
                var wy = Math.cos(time * 5 + s * 1.7) * wobbleAmt;
                p4.mesh.position.x = p4.mesh.position.x + (p4.gridX - p4.mesh.position.x) * 0.1 + wx;
                p4.mesh.position.y = p4.mesh.position.y + (p4.gridY - p4.mesh.position.y) * 0.1 + wy;
                p4.mesh.position.z *= 0.9;
                // Rotation settling
                p4.mesh.rotation.x *= 0.95;
                p4.mesh.rotation.y *= 0.95;
                p4.mesh.rotation.z *= 0.95;
            }

            // Hide stars
            for (var u = 0; u < this._stars.length; u++) {
                this._stars[u].mesh.visible = false;
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Mostly settled, still slightly off
            var t6 = (progress - 0.90) / 0.10;
            for (var v = 0; v < this._parts.length; v++) {
                var p5 = this._parts[v];
                // Almost at grid, tiny persistent wobble
                var tinyWob = (1 - t6) * 0.008;
                p5.mesh.position.set(
                    p5.gridX + Math.sin(time * 4 + v) * tinyWob,
                    p5.gridY + Math.cos(time * 3 + v) * tinyWob,
                    0
                );
                p5.mesh.rotation.set(0, 0, Math.sin(time * 2 + v) * 0.02 * (1 - t6));
                p5.mesh.material.opacity = 0.8 * (1 - t6);
            }
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._parts) { this._parts.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._stars) { this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        this._parts = this._stars = this._flash = null;
    }
};
