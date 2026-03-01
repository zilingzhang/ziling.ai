export default {
    name: 'Simmering',
    label: 'simmering',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Pot (cylinder)
        var potGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.25, 16);
        var potMat = new THREE.MeshBasicMaterial({
            color: 0x777777, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pot = new THREE.Mesh(potGeo, potMat);
        this._pot.position.set(ox - 0.3, oy - 0.2, 0);
        scene.add(this._pot);

        // Pot rim
        var rimGeo = new THREE.TorusGeometry(0.21, 0.015, 8, 24);
        var rimMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0
        });
        this._rim = new THREE.Mesh(rimGeo, rimMat);
        this._rim.position.set(ox - 0.3, oy - 0.08, 0);
        this._rim.rotation.x = Math.PI * 0.5;
        scene.add(this._rim);

        // Liquid surface
        var liqGeo = new THREE.CircleGeometry(0.19, 18);
        var liqMat = new THREE.MeshBasicMaterial({
            color: 0xcc7733, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liqGeo, liqMat);
        this._liquid.position.set(ox - 0.3, oy - 0.09, 0);
        scene.add(this._liquid);

        // Lazy bubbles (slow rising)
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 15; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xffddaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub, life: 0, maxLife: 0,
                vx: 0, vy: 0, startScale: 0.3
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // Surface ripple rings
        this._ripples = [];
        var ripGeo = new THREE.RingGeometry(0.01, 0.015, 16);
        for (var j = 0; j < 6; j++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xffddbb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var rip = new THREE.Mesh(ripGeo, rMat);
            rip.visible = false;
            scene.add(rip);
            this._ripples.push({
                mesh: rip, life: 0, maxLife: 0,
                cx: 0, cy: 0
            });
        }
        this._ripIdx = 0;
        this._lastRip = 0;

        // Low steam
        this._steam = [];
        var steamGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var k = 0; k < 10; k++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xeeddcc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stm = new THREE.Mesh(steamGeo, sMat);
            stm.visible = false;
            scene.add(stm);
            this._steam.push({
                mesh: stm, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._steamIdx = 0;

        // Warm orange underglow
        var glowGeo = new THREE.CircleGeometry(0.2, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff8833, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._underglow = new THREE.Mesh(glowGeo, glowMat);
        this._underglow.position.set(ox - 0.3, oy - 0.33, 0);
        scene.add(this._underglow);

        // Spoon (thin cylinder)
        var spoonGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6);
        var spoonMat = new THREE.MeshBasicMaterial({
            color: 0x999999, transparent: true, opacity: 0
        });
        this._spoon = new THREE.Mesh(spoonGeo, spoonMat);
        this._spoon.position.set(ox - 0.3, oy - 0.05, 0.05);
        this._spoon.rotation.z = 0.3;
        scene.add(this._spoon);
    },
    _spawnBubble(x, y) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(
            x + (Math.random() - 0.5) * 0.25,
            y - 0.1,
            (Math.random() - 0.5) * 0.06
        );
        b.vx = (Math.random() - 0.5) * 0.02;
        b.vy = 0.06 + Math.random() * 0.05; // Very slow - simmering not boiling
        b.life = 1.0 + Math.random() * 0.8;
        b.maxLife = b.life;
        b.startScale = 0.3 + Math.random() * 0.3;
        b.mesh.material.opacity = 0.4;
    },
    _spawnRipple(x, y) {
        var r = this._ripples[this._ripIdx % this._ripples.length];
        this._ripIdx++;
        r.mesh.visible = true;
        r.cx = x + (Math.random() - 0.5) * 0.15;
        r.cy = y;
        r.mesh.position.set(r.cx, r.cy, 0.01);
        r.mesh.scale.setScalar(1);
        r.life = 1.0 + Math.random() * 0.5;
        r.maxLife = r.life;
        r.mesh.material.opacity = 0.3;
    },
    _spawnSteam(x, y) {
        var s = this._steam[this._steamIdx % this._steam.length];
        this._steamIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        s.baseX = s.mesh.position.x;
        s.vx = 0;
        s.vy = 0.15 + Math.random() * 0.1; // Low, lazy steam
        s.life = 0.8 + Math.random() * 0.6;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.2;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var potX = ox - 0.3;
        var liqY = oy - 0.09;

        if (progress < 0.08) {
            // Phase 1: Pot appears
            var t = progress / 0.08;
            var ease = t * t;
            this._pot.material.opacity = ease * 0.7;
            this._rim.material.opacity = ease * 0.6;
            this._liquid.material.opacity = ease * 0.4;
            this._underglow.material.opacity = ease * 0.15;
            this._spoon.material.opacity = ease * 0.4;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Gentle start - lazy bubbles begin, low heat
            var t2 = (progress - 0.08) / 0.27;
            this._pot.material.opacity = 0.7;
            this._rim.material.opacity = 0.6;
            this._liquid.material.opacity = 0.4 + Math.sin(time * 1.5) * 0.03;

            // Slow, lazy bubbles
            if (time - this._lastBub > 0.8 - t2 * 0.3) {
                this._spawnBubble(potX, liqY);
                this._lastBub = time;
            }

            // Occasional surface ripple
            if (time - this._lastRip > 1.5) {
                this._spawnRipple(potX, liqY);
                this._lastRip = time;
            }

            // Low underglow
            this._underglow.material.opacity = 0.15 + t2 * 0.1 + Math.sin(time * 2) * 0.03;

            model.position.set(ox + 0.15, oy + Math.sin(time * 0.6) * 0.005, oz);
        } else if (progress < 0.60) {
            // Phase 3: Steady simmer rhythm, patient calm
            var t3 = (progress - 0.35) / 0.25;

            // Steady bubble pace
            if (time - this._lastBub > 0.5) {
                this._spawnBubble(potX, liqY);
                this._lastBub = time;
            }

            // Ripples from bubbles
            if (time - this._lastRip > 1.0) {
                this._spawnRipple(potX, liqY);
                this._lastRip = time;
            }

            // Low steam wisps
            if (Math.random() < 0.025) {
                this._spawnSteam(potX, liqY + 0.03);
            }

            // Warm underglow
            this._underglow.material.opacity = 0.25 + Math.sin(time * 1.5) * 0.05;

            // Liquid gently moves
            this._liquid.position.y = liqY + Math.sin(time * 1.2) * 0.005;

            model.position.set(ox + 0.15, oy + Math.sin(time * 0.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.4) * 0.01;
        } else if (progress < 0.72) {
            // Phase 4: Model stirs occasionally
            var t4 = (progress - 0.60) / 0.12;
            var stirCycle = Math.sin(t4 * Math.PI * 2);

            // Spoon stirs
            this._spoon.material.opacity = 0.5;
            this._spoon.rotation.z = 0.3 + stirCycle * 0.2;
            this._spoon.position.x = potX + stirCycle * 0.05;

            // Bubbles continue
            if (time - this._lastBub > 0.5) {
                this._spawnBubble(potX, liqY);
                this._lastBub = time;
            }

            // Ripples from stirring
            if (Math.random() < 0.05) {
                this._spawnRipple(potX + stirCycle * 0.05, liqY);
            }

            // Steam from stir
            if (Math.random() < 0.04) {
                this._spawnSteam(potX, liqY + 0.03);
            }

            // Model stirs
            model.position.set(
                ox + 0.15 + stirCycle * 0.02,
                oy,
                oz
            );
            model.rotation.z = stirCycle * 0.03;
        } else if (progress < 0.88) {
            // Phase 5: Return to calm steady simmer
            var t5 = (progress - 0.72) / 0.16;
            this._spoon.rotation.z = 0.3;
            this._spoon.position.x = potX;

            // Steady gentle bubbles
            if (time - this._lastBub > 0.6) {
                this._spawnBubble(potX, liqY);
                this._lastBub = time;
            }

            // Occasional ripple
            if (time - this._lastRip > 1.2) {
                this._spawnRipple(potX, liqY);
                this._lastRip = time;
            }

            // Gentle steam
            if (Math.random() < 0.02) {
                this._spawnSteam(potX, liqY + 0.03);
            }

            this._underglow.material.opacity = 0.25 + Math.sin(time * 1.5) * 0.04;

            model.position.set(ox + 0.15, oy + Math.sin(time * 0.5) * 0.005, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._pot.material.opacity = 0.7 * (1 - t6);
            this._rim.material.opacity = 0.6 * (1 - t6);
            this._liquid.material.opacity = 0.4 * (1 - t6);
            this._underglow.material.opacity = 0.25 * (1 - t6);
            this._spoon.material.opacity = 0.5 * (1 - t6);

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update bubbles (slow rise)
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            bb.mesh.position.x += Math.sin(time * 2 + bi * 2) * 0.001;
            var blr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = blr * 0.35;
            bb.mesh.scale.setScalar(bb.startScale + (1 - blr) * 0.4);
        }

        // Update ripples
        for (var ri = 0; ri < this._ripples.length; ri++) {
            var rp = this._ripples[ri];
            if (rp.life <= 0) continue;
            rp.life -= delta;
            if (rp.life <= 0) { rp.mesh.visible = false; continue; }
            var rlr = rp.life / rp.maxLife;
            rp.mesh.scale.setScalar(1 + (1 - rlr) * 6);
            rp.mesh.material.opacity = rlr * 0.2;
        }

        // Update steam
        for (var si = 0; si < this._steam.length; si++) {
            var sp = this._steam[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.x = sp.baseX + Math.sin(time * 1.5 + si * 2) * 0.025;
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr * 0.15;
            sp.mesh.scale.setScalar(0.5 + (1 - slr) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pot) { scene.remove(this._pot); this._pot.geometry.dispose(); this._pot.material.dispose(); }
        if (this._rim) { scene.remove(this._rim); this._rim.geometry.dispose(); this._rim.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._underglow) { scene.remove(this._underglow); this._underglow.geometry.dispose(); this._underglow.material.dispose(); }
        if (this._spoon) { scene.remove(this._spoon); this._spoon.geometry.dispose(); this._spoon.material.dispose(); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._ripples) { this._ripples.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._steam) { this._steam.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._pot = this._rim = this._liquid = this._underglow = this._spoon = this._bubbles = this._ripples = this._steam = null;
    }
};
