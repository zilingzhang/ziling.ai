export default {
    name: 'Canoodling',
    label: 'canoodling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var gs = this._origScale.x;

        // Partner sphere (second figure represented by a slightly smaller sphere cluster)
        var partGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var partMat = new THREE.MeshBasicMaterial({
            color: 0xffaa88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._partner = new THREE.Mesh(partGeo, partMat);
        this._partner.visible = false;
        scene.add(this._partner);

        // Heart particles floating between them
        this._hearts = [];
        var hGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var i = 0; i < 24; i++) {
            var hColors = [0xff6688, 0xff88aa, 0xffaacc, 0xff4466, 0xff8899, 0xffbbdd];
            var hMat = new THREE.MeshBasicMaterial({
                color: hColors[i % hColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hMesh = new THREE.Mesh(hGeo, hMat);
            hMesh.visible = false;
            scene.add(hMesh);
            this._hearts.push({
                mesh: hMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0, floatPhase: Math.random() * Math.PI * 2
            });
        }
        this._heartIdx = 0;
        this._lastHeart = 0;

        // Warm glow bubble surrounding both
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff8866, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._warmGlow = new THREE.Mesh(glowGeo, glowMat);
        this._warmGlow.position.set(ox, oy, 0);
        scene.add(this._warmGlow);

        // Sparkle trail of affection
        this._sparkles = [];
        var spkGeo = new THREE.OctahedronGeometry(0.008, 0);
        for (var s = 0; s < 16; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffcc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(spkGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._sparkles.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;
        this._lastSpk = 0;

        // Love-struck stars (larger sparkle octahedrons)
        this._loveStars = [];
        var lsGeo = new THREE.OctahedronGeometry(0.02, 0);
        for (var ls = 0; ls < 6; ls++) {
            var lsMat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lsMesh = new THREE.Mesh(lsGeo, lsMat);
            lsMesh.visible = false;
            scene.add(lsMesh);
            this._loveStars.push({
                mesh: lsMesh,
                angle: (ls / 6) * Math.PI * 2,
                radius: 0.3 + ls * 0.03,
                bobPhase: Math.random() * Math.PI * 2
            });
        }

        // Sunset glow (background warm gradient)
        var sunGeo = new THREE.SphereGeometry(0.8, 10, 10);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xff6633, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._sunsetGlow = new THREE.Mesh(sunGeo, sunMat);
        this._sunsetGlow.position.set(ox, oy - 0.1, -0.2);
        scene.add(this._sunsetGlow);

        this._orbitAngle = 0;
    },
    _emitHeart(x, y) {
        var h = this._hearts[this._heartIdx % this._hearts.length];
        this._heartIdx++;
        h.mesh.visible = true;
        h.mesh.position.set(x, y, 0);
        h.vx = (Math.random() - 0.5) * 0.3;
        h.vy = 0.3 + Math.random() * 0.5;
        h.vz = (Math.random() - 0.5) * 0.2;
        h.life = 1.0 + Math.random() * 0.8;
        h.maxLife = h.life;
        h.mesh.material.opacity = 0.7;
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.vx = (Math.random() - 0.5) * 0.4;
        s.vy = 0.2 + Math.random() * 0.4;
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        this._orbitAngle += delta * 0.8;

        if (progress < 0.08) {
            // Phase 1: Partner appears, both start orbiting
            var t = progress / 0.08;
            this._partner.visible = true;
            this._partner.material.opacity = t * 0.6;
            this._partner.position.set(ox + 0.3, oy, 0);
            this._partner.scale.setScalar(t * 0.8);

            model.position.set(ox - t * 0.1, oy, oz);

            this._sunsetGlow.material.opacity = t * 0.03;
        } else if (progress < 0.25) {
            // Phase 2: Orbiting close together, hearts start
            var t2 = (progress - 0.08) / 0.17;
            var orbitR = 0.15;
            var modelX = ox + Math.cos(this._orbitAngle) * orbitR;
            var modelY = oy + Math.sin(this._orbitAngle) * orbitR * 0.3;
            var partX = ox + Math.cos(this._orbitAngle + Math.PI) * orbitR;
            var partY = oy + Math.sin(this._orbitAngle + Math.PI) * orbitR * 0.3;

            model.position.set(modelX, modelY, oz);
            this._partner.position.set(partX, partY, 0);
            this._partner.material.opacity = 0.6;

            // Hearts float between
            if (time - this._lastHeart > 0.25) {
                var midX = (modelX + partX) / 2;
                var midY = (modelY + partY) / 2;
                this._emitHeart(midX, midY);
                this._lastHeart = time;
            }

            this._warmGlow.material.opacity = t2 * 0.08;
            this._warmGlow.position.set(ox, oy, 0);
            this._sunsetGlow.material.opacity = 0.03 + t2 * 0.02;
        } else if (progress < 0.50) {
            // Phase 3: Closer orbit, nuzzling (head tilts), sparkle trail
            var t3 = (progress - 0.25) / 0.25;
            var closeR = 0.12 - t3 * 0.03;
            var mX = ox + Math.cos(this._orbitAngle) * closeR;
            var mY = oy + Math.sin(this._orbitAngle) * closeR * 0.3;
            var pX = ox + Math.cos(this._orbitAngle + Math.PI) * closeR;
            var pY = oy + Math.sin(this._orbitAngle + Math.PI) * closeR * 0.3;

            model.position.set(mX, mY, oz);
            this._partner.position.set(pX, pY, 0);

            // Nuzzling - gentle tilt toward each other
            var tiltToward = Math.atan2(pY - mY, pX - mX);
            model.rotation.z = Math.sin(time * 2) * 0.06 + tiltToward * 0.05;
            this._partner.rotation.z = Math.sin(time * 2 + 1) * 0.06 - tiltToward * 0.05;

            // Hearts more frequent
            if (time - this._lastHeart > 0.15) {
                this._emitHeart((mX + pX) / 2, (mY + pY) / 2);
                this._lastHeart = time;
            }

            // Sparkle trail
            if (time - this._lastSpk > 0.08) {
                this._emitSparkle(mX, mY);
                this._emitSparkle(pX, pY);
                this._lastSpk = time;
            }

            // Love stars appear
            for (var ls = 0; ls < this._loveStars.length; ls++) {
                var star = this._loveStars[ls];
                star.mesh.visible = true;
                star.mesh.material.opacity = t3 * 0.5;
                star.angle += delta * 1.2;
                star.mesh.position.set(
                    ox + Math.cos(star.angle) * star.radius,
                    oy + Math.sin(star.angle + star.bobPhase) * star.radius * 0.5 + Math.sin(time * 2 + ls) * 0.02,
                    0
                );
                star.mesh.rotation.z = time * 3;
                star.mesh.scale.setScalar(0.5 + Math.sin(time * 3 + ls * 1.5) * 0.3);
            }

            this._warmGlow.material.opacity = 0.08 + t3 * 0.08;
            this._warmGlow.scale.setScalar(1 + t3 * 0.2);
            this._sunsetGlow.material.opacity = 0.05 + t3 * 0.02;
        } else if (progress < 0.75) {
            // Phase 4: Peak canoodling - very close, maximum hearts and glow
            var t4 = (progress - 0.50) / 0.25;
            var tinyR = 0.09 + Math.sin(time * 1.5) * 0.02;
            var m2X = ox + Math.cos(this._orbitAngle) * tinyR;
            var m2Y = oy + Math.sin(this._orbitAngle) * tinyR * 0.3;
            var p2X = ox + Math.cos(this._orbitAngle + Math.PI) * tinyR;
            var p2Y = oy + Math.sin(this._orbitAngle + Math.PI) * tinyR * 0.3;

            model.position.set(m2X, m2Y, oz);
            this._partner.position.set(p2X, p2Y, 0);

            // Intense nuzzling
            model.rotation.z = Math.sin(time * 2.5) * 0.08;
            this._partner.rotation.z = -Math.sin(time * 2.5) * 0.08;

            // Lots of hearts
            if (time - this._lastHeart > 0.08) {
                this._emitHeart((m2X + p2X) / 2, (m2Y + p2Y) / 2 + 0.05);
                this._lastHeart = time;
            }

            // Sparkles everywhere
            if (time - this._lastSpk > 0.05) {
                this._emitSparkle(m2X + (Math.random() - 0.5) * 0.1, m2Y + (Math.random() - 0.5) * 0.1);
                this._lastSpk = time;
            }

            // Love stars pulse
            for (var ls2 = 0; ls2 < this._loveStars.length; ls2++) {
                var star2 = this._loveStars[ls2];
                star2.mesh.material.opacity = 0.5 + Math.sin(time * 3 + ls2) * 0.2;
                star2.angle += delta * 1.5;
                star2.mesh.position.set(
                    ox + Math.cos(star2.angle) * star2.radius,
                    oy + Math.sin(star2.angle) * star2.radius * 0.5,
                    0
                );
                star2.mesh.rotation.z = time * 4;
            }

            this._warmGlow.material.opacity = 0.16 + Math.sin(time * 2) * 0.04;
            this._warmGlow.scale.setScalar(1.2 + Math.sin(time * 1.5) * 0.1);
            this._sunsetGlow.material.opacity = 0.07 + Math.sin(time * 1) * 0.02;
        } else if (progress < 0.90) {
            // Phase 5: Gently separating, warm afterglow
            var t5 = (progress - 0.75) / 0.15;
            var sepR = 0.09 + t5 * 0.15;
            var m3X = ox + Math.cos(this._orbitAngle) * sepR;
            var m3Y = oy + Math.sin(this._orbitAngle) * sepR * 0.3;
            var p3X = ox + Math.cos(this._orbitAngle + Math.PI) * sepR;
            var p3Y = oy + Math.sin(this._orbitAngle + Math.PI) * sepR * 0.3;

            model.position.set(m3X, m3Y, oz);
            model.rotation.z = model.rotation.z * (1 - t5);
            this._partner.position.set(p3X, p3Y, 0);
            this._partner.material.opacity = 0.6 * (1 - t5);
            this._partner.rotation.z = 0;

            // Hearts slow down
            if (time - this._lastHeart > 0.3) {
                this._emitHeart((m3X + p3X) / 2, (m3Y + p3Y) / 2);
                this._lastHeart = time;
            }

            // Stars fade
            for (var ls3 = 0; ls3 < this._loveStars.length; ls3++) {
                this._loveStars[ls3].mesh.material.opacity = 0.5 * (1 - t5);
            }

            this._warmGlow.material.opacity = 0.16 * (1 - t5);
            this._sunsetGlow.material.opacity = 0.07 * (1 - t5);
        } else {
            // Phase 6: Return to normal
            var t6 = (progress - 0.90) / 0.10;
            model.position.set(
                ox + (model.position.x - ox) * (1 - t6),
                oy,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._partner.visible = false;
            for (var ls4 = 0; ls4 < this._loveStars.length; ls4++) {
                this._loveStars[ls4].mesh.visible = false;
            }
            this._warmGlow.material.opacity = 0;
            this._sunsetGlow.material.opacity = 0;
        }

        // Update heart particles
        for (var hi = 0; hi < this._hearts.length; hi++) {
            var heart = this._hearts[hi];
            if (heart.life <= 0) continue;
            heart.life -= delta;
            if (heart.life <= 0) { heart.mesh.visible = false; continue; }
            heart.mesh.position.x += heart.vx * delta;
            heart.mesh.position.y += heart.vy * delta;
            heart.mesh.position.z += heart.vz * delta;
            heart.vy -= 0.1 * delta;
            heart.mesh.position.x += Math.sin(time * 3 + heart.floatPhase) * 0.1 * delta;
            heart.mesh.material.opacity = (heart.life / heart.maxLife) * 0.6;
            heart.mesh.scale.setScalar(0.7 + (1 - heart.life / heart.maxLife) * 0.5);
        }

        // Update sparkle particles
        for (var si = 0; si < this._sparkles.length; si++) {
            var spk = this._sparkles[si];
            if (spk.life <= 0) continue;
            spk.life -= delta;
            if (spk.life <= 0) { spk.mesh.visible = false; continue; }
            spk.mesh.position.x += spk.vx * delta;
            spk.mesh.position.y += spk.vy * delta;
            spk.mesh.rotation.z = time * 5;
            spk.mesh.material.opacity = (spk.life / spk.maxLife) * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._partner) { scene.remove(this._partner); this._partner.geometry.dispose(); this._partner.material.dispose(); }
        if (this._hearts) { this._hearts.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._warmGlow) { scene.remove(this._warmGlow); this._warmGlow.geometry.dispose(); this._warmGlow.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._loveStars) { this._loveStars.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._sunsetGlow) { scene.remove(this._sunsetGlow); this._sunsetGlow.geometry.dispose(); this._sunsetGlow.material.dispose(); }
        this._partner = this._hearts = this._warmGlow = this._sparkles = this._loveStars = this._sunsetGlow = null;
    }
};
