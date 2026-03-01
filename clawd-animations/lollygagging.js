export default {
    name: 'Lollygagging',
    label: 'lollygagging',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Snail trail (slow curved line of dots)
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var i = 0; i < 20; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xaabb88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tMesh = new THREE.Mesh(trailGeo, tMat);
            tMesh.visible = false;
            scene.add(tMesh);
            this._trail.push({
                mesh: tMesh, placed: false, px: 0, py: 0,
                life: 0, maxLife: 0
            });
        }
        this._trailIdx = 0;
        this._lastTrail = 0;

        // Cloud spheres (lazy, drifting)
        this._clouds = [];
        var cloudGeo = new THREE.SphereGeometry(0.05, 6, 6);
        for (var c = 0; c < 4; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xeeeeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cMesh = new THREE.Mesh(cloudGeo, cMat);
            cMesh.visible = false;
            cMesh.scale.set(1 + c * 0.2, 0.5, 1);
            scene.add(cMesh);
            this._clouds.push({
                mesh: cMesh,
                baseX: ox - 0.4 + c * 0.25,
                baseY: oy + 0.3 + (Math.random() - 0.5) * 0.05,
                speed: 0.02 + Math.random() * 0.03
            });
        }

        // Lollipop particle (circle on stick)
        var lolliGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var lolliMat = new THREE.MeshBasicMaterial({
            color: 0xff6688, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._lolliHead = new THREE.Mesh(lolliGeo, lolliMat);
        this._lolliHead.visible = false;
        scene.add(this._lolliHead);

        var stickGeo = new THREE.BoxGeometry(0.005, 0.06, 0.005);
        var stickMat = new THREE.MeshBasicMaterial({
            color: 0xddddbb, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._lolliStick = new THREE.Mesh(stickGeo, stickMat);
        this._lolliStick.visible = false;
        scene.add(this._lolliStick);

        // Daydream bubbles
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var b = 0; b < 8; b++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xddddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var bMesh = new THREE.Mesh(bubGeo, bMat);
            bMesh.visible = false;
            scene.add(bMesh);
            this._bubbles.push({
                mesh: bMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseScale: 0.5 + Math.random() * 1.0
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // Yawn particle (wide oval)
        var yawnGeo = new THREE.SphereGeometry(0.03, 8, 4);
        var yawnMat = new THREE.MeshBasicMaterial({
            color: 0xffccaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._yawn = new THREE.Mesh(yawnGeo, yawnMat);
        this._yawn.visible = false;
        this._yawn.scale.set(1.5, 1, 1);
        scene.add(this._yawn);

        // Lazy summer glow
        var lazyGeo = new THREE.SphereGeometry(0.4, 10, 10);
        var lazyMat = new THREE.MeshBasicMaterial({
            color: 0xffeeaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._lazyGlow = new THREE.Mesh(lazyGeo, lazyMat);
        this._lazyGlow.position.set(ox, oy, 0);
        scene.add(this._lazyGlow);

        this._modelX = ox;
        this._slowTime = 0;
    },
    _emitBubble(x, y) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + 0.1, 0);
        b.vx = (Math.random() - 0.5) * 0.15;
        b.vy = 0.15 + Math.random() * 0.2;
        b.life = 1.5 + Math.random() * 1.0;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Everything in this animation is S-L-O-W
        this._slowTime += delta * 0.3;

        if (progress < 0.08) {
            // Phase 1: Model barely starts moving
            var t = progress / 0.08;
            this._modelX = ox + t * 0.02;
            model.position.set(this._modelX, oy, oz);
            model.rotation.z = 0;

            this._lazyGlow.material.opacity = t * 0.05;

            // Clouds appear
            for (var c = 0; c < this._clouds.length; c++) {
                var cloud = this._clouds[c];
                cloud.mesh.visible = true;
                cloud.mesh.material.opacity = t * 0.2;
                cloud.mesh.position.set(cloud.baseX, cloud.baseY, -0.1);
            }
        } else if (progress < 0.25) {
            // Phase 2: Barely walking, snail trail, clouds drift
            var t2 = (progress - 0.08) / 0.17;
            this._modelX = ox + 0.02 + t2 * 0.03;
            model.position.set(this._modelX, oy + Math.sin(this._slowTime * 3) * 0.003, oz);
            model.rotation.z = Math.sin(this._slowTime * 2) * 0.01;

            // Snail trail
            if (time - this._lastTrail > 0.4) {
                var tr = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr.mesh.visible = true;
                tr.mesh.position.set(this._modelX - 0.05, oy - 0.05, 0);
                tr.mesh.material.opacity = 0.4;
                tr.life = 5.0;
                tr.maxLife = 5.0;
                this._lastTrail = time;
            }

            // Clouds drift lazily
            for (var c2 = 0; c2 < this._clouds.length; c2++) {
                var cl2 = this._clouds[c2];
                cl2.mesh.material.opacity = 0.2;
                cl2.mesh.position.x = cl2.baseX + Math.sin(time * cl2.speed) * 0.15;
            }

            this._lazyGlow.material.opacity = 0.05;
        } else if (progress < 0.45) {
            // Phase 3: Cloud watching - model looks up
            var t3 = (progress - 0.25) / 0.20;
            model.position.set(this._modelX, oy, oz);
            model.rotation.z = t3 * -0.08;

            // Lollipop appears
            this._lolliHead.visible = true;
            this._lolliStick.visible = true;
            this._lolliHead.material.opacity = t3 * 0.6;
            this._lolliStick.material.opacity = t3 * 0.5;
            this._lolliHead.position.set(this._modelX + 0.08, oy + 0.05, 0.02);
            this._lolliStick.position.set(this._modelX + 0.08, oy + 0.02, 0.02);
            this._lolliHead.rotation.z = Math.sin(time * 0.5) * 0.2;
            this._lolliStick.rotation.z = Math.sin(time * 0.5) * 0.2;

            // Clouds drift, model watches them
            for (var c3 = 0; c3 < this._clouds.length; c3++) {
                var cl3 = this._clouds[c3];
                cl3.mesh.material.opacity = 0.25 + Math.sin(time * 0.5 + c3) * 0.05;
                cl3.mesh.position.x = cl3.baseX + Math.sin(time * cl3.speed * 2) * 0.2;
                cl3.mesh.position.y = cl3.baseY + Math.cos(time * cl3.speed) * 0.02;
            }

            // Daydream bubbles
            if (time - this._lastBub > 0.6) {
                this._emitBubble(this._modelX, oy);
                this._lastBub = time;
            }

            // Snail trail
            if (time - this._lastTrail > 0.5) {
                var tr2 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr2.mesh.visible = true;
                tr2.mesh.position.set(this._modelX - 0.05, oy - 0.05, 0);
                tr2.mesh.material.opacity = 0.3;
                tr2.life = 5.0;
                tr2.maxLife = 5.0;
                this._lastTrail = time;
            }

            this._lazyGlow.material.opacity = 0.06 + t3 * 0.02;
        } else if (progress < 0.60) {
            // Phase 4: Yawn and slow motion movement
            var t4 = (progress - 0.45) / 0.15;
            this._modelX += delta * 0.01;
            model.position.set(this._modelX, oy + Math.sin(this._slowTime * 2) * 0.003, oz);

            // Yawn
            this._yawn.visible = true;
            var yawnCycle = Math.sin(t4 * Math.PI);
            this._yawn.material.opacity = yawnCycle * 0.5;
            this._yawn.position.set(this._modelX + 0.06, oy + 0.06, 0.03);
            this._yawn.scale.set(1.5 * (0.5 + yawnCycle * 0.8), 1 * (0.5 + yawnCycle * 0.5), 1);

            model.rotation.z = -0.08 + yawnCycle * 0.03;

            // Lollipop droops
            this._lolliHead.material.opacity = 0.6;
            this._lolliStick.material.opacity = 0.5;
            this._lolliHead.position.set(this._modelX + 0.08, oy + 0.03, 0.02);
            this._lolliStick.position.set(this._modelX + 0.08, oy, 0.02);
            this._lolliHead.rotation.z = -0.3;
            this._lolliStick.rotation.z = -0.3;

            // Clouds keep drifting
            for (var c4 = 0; c4 < this._clouds.length; c4++) {
                var cl4 = this._clouds[c4];
                cl4.mesh.position.x = cl4.baseX + Math.sin(time * cl4.speed * 2) * 0.2;
            }

            // Bubbles slower
            if (time - this._lastBub > 0.8) {
                this._emitBubble(this._modelX, oy);
                this._lastBub = time;
            }

            this._lazyGlow.material.opacity = 0.08;
        } else if (progress < 0.78) {
            // Phase 5: Time in slow motion, barely progressing
            var t5 = (progress - 0.60) / 0.18;
            this._yawn.visible = false;

            // Glacial movement
            this._modelX += delta * 0.015;
            model.position.set(this._modelX, oy + Math.sin(this._slowTime * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(this._slowTime * 1) * 0.02;

            // Lollipop
            this._lolliHead.position.set(this._modelX + 0.08, oy + 0.04, 0.02);
            this._lolliStick.position.set(this._modelX + 0.08, oy + 0.01, 0.02);
            this._lolliHead.rotation.z = Math.sin(time * 0.3) * 0.15;
            this._lolliStick.rotation.z = Math.sin(time * 0.3) * 0.15;

            // Clouds
            for (var c5 = 0; c5 < this._clouds.length; c5++) {
                var cl5 = this._clouds[c5];
                cl5.mesh.position.x = cl5.baseX + time * cl5.speed * 0.5;
            }

            // Occasional bubble
            if (time - this._lastBub > 1.0) {
                this._emitBubble(this._modelX, oy);
                this._lastBub = time;
            }

            // Trail
            if (time - this._lastTrail > 0.5) {
                var tr3 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr3.mesh.visible = true;
                tr3.mesh.position.set(this._modelX - 0.05, oy - 0.05, 0);
                tr3.mesh.material.opacity = 0.3;
                tr3.life = 5.0;
                tr3.maxLife = 5.0;
                this._lastTrail = time;
            }

            this._lazyGlow.material.opacity = 0.08 - t5 * 0.03;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.78) / 0.22;
            model.position.set(
                ox + (this._modelX - ox) * (1 - t6),
                oy,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Everything fades
            for (var c6 = 0; c6 < this._clouds.length; c6++) {
                this._clouds[c6].mesh.material.opacity = 0.2 * (1 - t6);
            }
            this._lolliHead.material.opacity = 0.6 * (1 - t6);
            this._lolliStick.material.opacity = 0.5 * (1 - t6);
            this._lazyGlow.material.opacity = 0.05 * (1 - t6);

            for (var tr4 = 0; tr4 < this._trail.length; tr4++) {
                if (this._trail[tr4].mesh.visible) {
                    this._trail[tr4].mesh.material.opacity *= (1 - t6);
                }
            }
        }

        // Update daydream bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bub = this._bubbles[bi];
            if (bub.life <= 0) continue;
            bub.life -= delta;
            if (bub.life <= 0) { bub.mesh.visible = false; continue; }
            bub.mesh.position.x += bub.vx * delta;
            bub.mesh.position.y += bub.vy * delta;
            bub.mesh.position.x += Math.sin(time * 1.5 + bi) * 0.02 * delta;
            bub.mesh.material.opacity = (bub.life / bub.maxLife) * 0.35;
            bub.mesh.scale.setScalar(bub.baseScale * (1 + (1 - bub.life / bub.maxLife) * 0.5));
        }

        // Update trail
        for (var ti = 0; ti < this._trail.length; ti++) {
            var trl = this._trail[ti];
            if (trl.life <= 0) continue;
            trl.life -= delta;
            if (trl.life <= 0) { trl.mesh.visible = false; }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._trail) { this._trail.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._clouds) { this._clouds.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._lolliHead) { scene.remove(this._lolliHead); this._lolliHead.geometry.dispose(); this._lolliHead.material.dispose(); }
        if (this._lolliStick) { scene.remove(this._lolliStick); this._lolliStick.geometry.dispose(); this._lolliStick.material.dispose(); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._yawn) { scene.remove(this._yawn); this._yawn.geometry.dispose(); this._yawn.material.dispose(); }
        if (this._lazyGlow) { scene.remove(this._lazyGlow); this._lazyGlow.geometry.dispose(); this._lazyGlow.material.dispose(); }
        this._trail = this._clouds = this._lolliHead = this._lolliStick = this._bubbles = this._yawn = this._lazyGlow = null;
    }
};
