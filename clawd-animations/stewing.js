export default {
    name: 'Stewing',
    label: 'stewing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Large pot (cylinder)
        var potGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.28, 16);
        var potMat = new THREE.MeshBasicMaterial({
            color: 0x666666, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pot = new THREE.Mesh(potGeo, potMat);
        this._pot.position.set(ox - 0.3, oy - 0.18, 0);
        scene.add(this._pot);

        // Lid (disc that bounces)
        var lidGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16);
        var lidMat = new THREE.MeshBasicMaterial({
            color: 0x777777, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._lid = new THREE.Mesh(lidGeo, lidMat);
        this._lid.position.set(ox - 0.3, oy - 0.03, 0);
        scene.add(this._lid);

        // Lid knob
        var knobGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var knobMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0
        });
        this._knob = new THREE.Mesh(knobGeo, knobMat);
        this._knob.position.set(ox - 0.3, oy - 0.01, 0);
        scene.add(this._knob);

        // Ingredients (varied colored spheres visible inside)
        this._ingredients = [];
        var ingrColors = [0xcc4433, 0xff8844, 0x77aa33, 0xddcc44, 0x996633, 0xee6644];
        var ingrGeo = new THREE.SphereGeometry(0.03, 8, 8);
        for (var i = 0; i < 8; i++) {
            var iMat = new THREE.MeshBasicMaterial({
                color: ingrColors[i % ingrColors.length],
                transparent: true, opacity: 0
            });
            var ingr = new THREE.Mesh(ingrGeo, iMat);
            var angle = (i / 8) * Math.PI * 2;
            var dist = 0.05 + Math.random() * 0.08;
            ingr.position.set(
                ox - 0.3 + Math.cos(angle) * dist,
                oy - 0.2 + Math.random() * 0.08,
                Math.sin(angle) * dist * 0.3
            );
            ingr.userData.origColor = ingrColors[i % ingrColors.length];
            ingr.userData.angle = angle;
            ingr.userData.dist = dist;
            scene.add(ingr);
            this._ingredients.push(ingr);
        }

        // Low bubbles
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var j = 0; j < 15; j++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xcc8844, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bMesh = new THREE.Mesh(bubGeo, bMat);
            bMesh.visible = false;
            scene.add(bMesh);
            this._bubbles.push({
                mesh: bMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // Thick steam (escaping from under lid)
        this._steam = [];
        var steamGeo = new THREE.SphereGeometry(0.035, 6, 6);
        for (var k = 0; k < 15; k++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: 0xddccbb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stMesh = new THREE.Mesh(steamGeo, stMat);
            stMesh.visible = false;
            scene.add(stMesh);
            this._steam.push({
                mesh: stMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._steamIdx = 0;

        // Warm underglow
        var glowGeo = new THREE.CircleGeometry(0.2, 14);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff7722, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._underglow = new THREE.Mesh(glowGeo, glowMat);
        this._underglow.position.set(ox - 0.3, oy - 0.33, 0);
        scene.add(this._underglow);

        this._blendProgress = 0;
    },
    _spawnBubble(x, y) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(
            x + (Math.random() - 0.5) * 0.2,
            y,
            (Math.random() - 0.5) * 0.06
        );
        b.vx = (Math.random() - 0.5) * 0.03;
        b.vy = 0.08 + Math.random() * 0.06;
        b.life = 0.8 + Math.random() * 0.5;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.35;
    },
    _spawnSteam(x, y) {
        var s = this._steam[this._steamIdx % this._steam.length];
        this._steamIdx++;
        s.mesh.visible = true;
        // Escape from under the lid edge
        var angle = Math.random() * Math.PI * 2;
        s.mesh.position.set(
            x + Math.cos(angle) * 0.22,
            y,
            0
        );
        s.baseX = s.mesh.position.x;
        s.vx = Math.cos(angle) * 0.05;
        s.vy = 0.2 + Math.random() * 0.15;
        s.life = 0.8 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.3;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var potX = ox - 0.3;
        var lidBaseY = oy - 0.03;

        if (progress < 0.08) {
            // Phase 1: Pot with lid appears
            var t = progress / 0.08;
            var ease = t * t;
            this._pot.material.opacity = ease * 0.7;
            this._lid.material.opacity = ease * 0.6;
            this._knob.material.opacity = ease * 0.5;
            this._underglow.material.opacity = ease * 0.12;
            for (var ii = 0; ii < this._ingredients.length; ii++) {
                this._ingredients[ii].material.opacity = ease * 0.7;
            }
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Low bubbling starts, ingredients visible
            var t2 = (progress - 0.08) / 0.27;
            this._pot.material.opacity = 0.7;
            this._lid.material.opacity = 0.6;
            this._knob.material.opacity = 0.5;

            // Low bubbles
            if (time - this._lastBub > 0.6 - t2 * 0.2) {
                this._spawnBubble(potX, oy - 0.15);
                this._lastBub = time;
            }

            // Ingredients bob gently
            for (var j = 0; j < this._ingredients.length; j++) {
                var ingr = this._ingredients[j];
                ingr.position.y = oy - 0.2 + Math.random() * 0.001 + Math.sin(time * 0.8 + j) * 0.01;
            }

            // Lid starts slight bounce from steam
            var lidBounce = Math.max(0, Math.sin(time * 3)) * t2 * 0.01;
            this._lid.position.y = lidBaseY + lidBounce;
            this._knob.position.y = lidBaseY + 0.02 + lidBounce;

            // Steam starts escaping
            if (t2 > 0.5 && Math.random() < 0.03) {
                this._spawnSteam(potX, lidBaseY);
            }

            this._underglow.material.opacity = 0.12 + t2 * 0.08 + Math.sin(time * 1.5) * 0.03;

            model.position.set(ox + 0.15, oy + Math.sin(time * 0.6) * 0.005, oz);
        } else if (progress < 0.70) {
            // Phase 3: Colors blend together, thick steam, lid bounces more
            var t3 = (progress - 0.35) / 0.35;
            this._blendProgress = t3;

            // Ingredients' colors merge toward rich brown
            var targetR = 0.55;
            var targetG = 0.35;
            var targetB = 0.2;
            for (var k = 0; k < this._ingredients.length; k++) {
                var ing = this._ingredients[k];
                var origColor = new THREE.Color(ing.userData.origColor);
                var blendR = origColor.r + (targetR - origColor.r) * t3;
                var blendG = origColor.g + (targetG - origColor.g) * t3;
                var blendB = origColor.b + (targetB - origColor.b) * t3;
                ing.material.color.setRGB(blendR, blendG, blendB);
                ing.position.y = oy - 0.2 + Math.sin(time * 0.8 + k) * 0.012;
            }

            // Steady bubbling
            if (time - this._lastBub > 0.4) {
                this._spawnBubble(potX, oy - 0.15);
                this._lastBub = time;
            }

            // Thicker steam escaping from lid edges
            if (Math.random() < 0.05 + t3 * 0.04) {
                this._spawnSteam(potX, lidBaseY);
            }

            // Lid bounces from steam pressure
            var steamPressure = Math.max(0, Math.sin(time * 4)) * (0.01 + t3 * 0.015);
            this._lid.position.y = lidBaseY + steamPressure;
            this._knob.position.y = lidBaseY + 0.02 + steamPressure;
            // Slight lid rattle
            this._lid.position.x = potX + Math.sin(time * 12) * 0.003 * t3;

            this._underglow.material.opacity = 0.2 + Math.sin(time * 1.5) * 0.04;

            model.position.set(ox + 0.15, oy + Math.sin(time * 0.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.4) * 0.015;
        } else if (progress < 0.88) {
            // Phase 4: Rich merged stew, calming
            var t4 = (progress - 0.70) / 0.18;

            // All ingredients now rich brown
            for (var m = 0; m < this._ingredients.length; m++) {
                this._ingredients[m].material.color.setRGB(0.55, 0.35, 0.2);
                this._ingredients[m].position.y = oy - 0.2 + Math.sin(time * 0.6 + m) * 0.008;
            }

            // Gentler bubble rhythm
            if (time - this._lastBub > 0.6) {
                this._spawnBubble(potX, oy - 0.15);
                this._lastBub = time;
            }

            // Steam continues
            if (Math.random() < 0.04) {
                this._spawnSteam(potX, lidBaseY);
            }

            // Lid settles to gentle bounce
            var gentleBounce = Math.max(0, Math.sin(time * 3)) * 0.008;
            this._lid.position.y = lidBaseY + gentleBounce;
            this._lid.position.x = potX;
            this._knob.position.y = lidBaseY + 0.02 + gentleBounce;

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.88) / 0.12;
            this._pot.material.opacity = 0.7 * (1 - t5);
            this._lid.material.opacity = 0.6 * (1 - t5);
            this._knob.material.opacity = 0.5 * (1 - t5);
            this._underglow.material.opacity = 0.2 * (1 - t5);
            for (var n = 0; n < this._ingredients.length; n++) {
                this._ingredients[n].material.opacity = 0.7 * (1 - t5);
            }

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            bb.mesh.position.x += Math.sin(time * 2 + bi) * 0.001;
            var blr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = blr * 0.3;
            bb.mesh.scale.setScalar(0.5 + (1 - blr) * 0.5);
        }

        // Update steam
        for (var si = 0; si < this._steam.length; si++) {
            var sp = this._steam[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.x += Math.sin(time * 2 + si * 1.5) * 0.002;
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr * 0.25;
            sp.mesh.scale.setScalar(0.6 + (1 - slr) * 1.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pot) { scene.remove(this._pot); this._pot.geometry.dispose(); this._pot.material.dispose(); }
        if (this._lid) { scene.remove(this._lid); this._lid.geometry.dispose(); this._lid.material.dispose(); }
        if (this._knob) { scene.remove(this._knob); this._knob.geometry.dispose(); this._knob.material.dispose(); }
        if (this._underglow) { scene.remove(this._underglow); this._underglow.geometry.dispose(); this._underglow.material.dispose(); }
        if (this._ingredients) { this._ingredients.forEach(function(ig) { scene.remove(ig); ig.geometry.dispose(); ig.material.dispose(); }); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._steam) { this._steam.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._pot = this._lid = this._knob = this._underglow = this._ingredients = this._bubbles = this._steam = null;
    }
};
