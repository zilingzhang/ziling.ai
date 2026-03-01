export default {
    name: 'Crafting',
    label: 'crafting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Workbench flat box
        var benchGeo = new THREE.BoxGeometry(0.5, 0.04, 0.25);
        var benchMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0
        });
        this._bench = new THREE.Mesh(benchGeo, benchMat);
        this._bench.position.set(ox - 0.25, oy - 0.18, 0);
        scene.add(this._bench);

        // Bench legs (two small boxes)
        var legGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
        var legMat1 = new THREE.MeshBasicMaterial({
            color: 0x775533, transparent: true, opacity: 0
        });
        this._legL = new THREE.Mesh(legGeo, legMat1);
        this._legL.position.set(ox - 0.45, oy - 0.26, 0);
        scene.add(this._legL);

        var legMat2 = new THREE.MeshBasicMaterial({
            color: 0x775533, transparent: true, opacity: 0
        });
        this._legR = new THREE.Mesh(legGeo, legMat2);
        this._legR.position.set(ox - 0.05, oy - 0.26, 0);
        scene.add(this._legR);

        // Material mesh (starts as sphere, morphs via scale changes)
        var matGeo = new THREE.SphereGeometry(0.06, 10, 10);
        var matMat = new THREE.MeshBasicMaterial({
            color: 0xcc9966, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._material = new THREE.Mesh(matGeo, matMat);
        this._material.position.set(ox - 0.25, oy - 0.12, 0.02);
        this._material.visible = false;
        scene.add(this._material);

        // 3 tool shapes (small geometries that represent tools)
        this._tools = [];
        // Tool 1: chisel (thin box)
        var t1Geo = new THREE.BoxGeometry(0.02, 0.12, 0.02);
        var t1Mat = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa, transparent: true, opacity: 0
        });
        var tool1 = new THREE.Mesh(t1Geo, t1Mat);
        tool1.visible = false;
        scene.add(tool1);
        this._tools.push({ mesh: tool1, type: 'chisel', restX: ox - 0.5, restY: oy - 0.05 });

        // Tool 2: hammer (box head on thin stick)
        var t2Geo = new THREE.BoxGeometry(0.05, 0.035, 0.035);
        var t2Mat = new THREE.MeshBasicMaterial({
            color: 0x999999, transparent: true, opacity: 0
        });
        var tool2 = new THREE.Mesh(t2Geo, t2Mat);
        tool2.visible = false;
        scene.add(tool2);
        this._tools.push({ mesh: tool2, type: 'hammer', restX: ox - 0.5, restY: oy + 0.02 });

        // Tool 3: plane (flat box)
        var t3Geo = new THREE.BoxGeometry(0.08, 0.02, 0.04);
        var t3Mat = new THREE.MeshBasicMaterial({
            color: 0xbb8844, transparent: true, opacity: 0
        });
        var tool3 = new THREE.Mesh(t3Geo, t3Mat);
        tool3.visible = false;
        scene.add(tool3);
        this._tools.push({ mesh: tool3, type: 'plane', restX: ox - 0.5, restY: oy + 0.08 });

        // 20 shaving/chip particles
        this._shavings = [];
        var shavGeo = new THREE.BoxGeometry(0.015, 0.008, 0.008);
        for (var i = 0; i < 20; i++) {
            var shMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xddaa66 : (i % 3 === 1 ? 0xcc8844 : 0xeebb77),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var shav = new THREE.Mesh(shavGeo, shMat);
            shav.visible = false;
            scene.add(shav);
            this._shavings.push({
                mesh: shav, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                rotSpeed: 0
            });
        }
        this._shavIdx = 0;
        this._lastShav = 0;

        // Product glow
        var glowGeo = new THREE.SphereGeometry(0.2, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._productGlow = new THREE.Mesh(glowGeo, glowMat);
        this._productGlow.position.set(ox - 0.25, oy - 0.12, -0.05);
        scene.add(this._productGlow);

        this._activeTool = 0;
    },
    _emitShaving(x, y, dirX) {
        var s = this._shavings[this._shavIdx % this._shavings.length];
        this._shavIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.03);
        var a = dirX > 0 ? Math.random() * Math.PI * 0.6 : Math.PI - Math.random() * Math.PI * 0.6;
        var spd = 1.0 + Math.random() * 2.0;
        s.vx = Math.cos(a) * spd;
        s.vy = Math.sin(a) * spd * 0.5 + 0.5;
        s.vz = (Math.random() - 0.5) * 0.5;
        s.life = 0.3 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.rotSpeed = (Math.random() - 0.5) * 10;
        s.mesh.material.opacity = 0.9;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var matX = ox - 0.25;
        var matY = oy - 0.12;

        if (progress < 0.08) {
            // Phase 1: Workbench appears
            var t = progress / 0.08;
            var ease = t * t;
            this._bench.material.opacity = ease * 0.6;
            this._legL.material.opacity = ease * 0.5;
            this._legR.material.opacity = ease * 0.5;
            this._bench.scale.setScalar(0.5 + ease * 0.5);

            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.18) {
            // Phase 2: Material placed on bench
            var t2 = (progress - 0.08) / 0.10;
            this._bench.material.opacity = 0.6;
            this._legL.material.opacity = 0.5;
            this._legR.material.opacity = 0.5;

            this._material.visible = true;
            var matFade = Math.min(1, t2 * 2);
            this._material.material.opacity = matFade * 0.7;
            // Material drops down from above
            this._material.position.y = matY + 0.2 * (1 - matFade);
            this._material.scale.set(1, 1, 1);

            model.position.set(ox + 0.1, oy + Math.sin(time * 1.5) * 0.003, oz);
        } else if (progress < 0.45) {
            // Phase 3: Tool works on material, sparks fly
            var t3 = (progress - 0.18) / 0.27;

            // Cycle through tools
            this._activeTool = Math.floor(t3 * 3) % 3;

            for (var ti = 0; ti < 3; ti++) {
                var tool = this._tools[ti];
                if (ti === this._activeTool) {
                    tool.mesh.visible = true;
                    tool.mesh.material.opacity = 0.7;

                    // Tool moves back and forth over material
                    var toolCycle = (time * 4) % 1;
                    var toolX = matX + Math.sin(toolCycle * Math.PI * 2) * 0.08;
                    var toolY = matY + 0.06 + Math.abs(Math.sin(toolCycle * Math.PI * 4)) * 0.03;
                    tool.mesh.position.set(toolX, toolY, 0.04);
                    tool.mesh.rotation.z = Math.sin(toolCycle * Math.PI * 2) * 0.2;

                    // Emit shavings when tool is near material
                    if (Math.abs(Math.sin(toolCycle * Math.PI * 4)) < 0.15 && time - this._lastShav > 0.08) {
                        this._emitShaving(toolX, matY, Math.sin(toolCycle * Math.PI * 2));
                        this._lastShav = time;
                    }
                } else {
                    tool.mesh.visible = true;
                    tool.mesh.material.opacity = 0.3;
                    tool.mesh.position.set(tool.restX, tool.restY, 0);
                    tool.mesh.rotation.z = 0;
                }
            }

            // Material starts morphing (sphere -> stretched shape)
            var morph1 = Math.min(1, t3 * 1.5);
            this._material.scale.set(1 + morph1 * 0.5, 1 - morph1 * 0.2, 1 + morph1 * 0.2);
            this._material.material.opacity = 0.7;

            model.position.set(ox + 0.1 + Math.sin(time * 2) * 0.01, oy, oz);
            model.rotation.z = Math.sin(time * 1) * 0.02;
        } else if (progress < 0.65) {
            // Phase 4: Material reshapes more, more particles
            var t4 = (progress - 0.45) / 0.20;

            // Continue tool work with more intensity
            var tool2 = this._tools[1]; // Hammer for reshaping
            tool2.mesh.visible = true;
            tool2.mesh.material.opacity = 0.8;
            var hammerCycle = (time * 5) % 1;
            var hammerX = matX + Math.sin(hammerCycle * Math.PI * 2) * 0.06;
            var hammerY = matY + 0.07 + Math.abs(Math.sin(hammerCycle * Math.PI * 4)) * 0.04;
            tool2.mesh.position.set(hammerX, hammerY, 0.04);
            tool2.mesh.rotation.z = Math.sin(hammerCycle * Math.PI * 2) * 0.3;

            // Hide other tools at rest
            this._tools[0].mesh.visible = true;
            this._tools[0].mesh.material.opacity = 0.3;
            this._tools[0].mesh.position.set(this._tools[0].restX, this._tools[0].restY, 0);
            this._tools[2].mesh.visible = true;
            this._tools[2].mesh.material.opacity = 0.3;
            this._tools[2].mesh.position.set(this._tools[2].restX, this._tools[2].restY, 0);

            // More shavings
            if (Math.abs(Math.sin(hammerCycle * Math.PI * 4)) < 0.12 && time - this._lastShav > 0.05) {
                this._emitShaving(hammerX, matY, Math.sin(hammerCycle * Math.PI * 2));
                this._emitShaving(hammerX, matY, -Math.sin(hammerCycle * Math.PI * 2));
                this._lastShav = time;
            }

            // Material reshaping further (box-like)
            var morph2 = 1 + t4;
            this._material.scale.set(1.5 + t4 * 0.3, 0.8 - t4 * 0.15, 1.2 + t4 * 0.1);
            this._material.material.color.setRGB(
                0.85 + t4 * 0.1,
                0.6 + t4 * 0.1,
                0.35 + t4 * 0.05
            );

            model.position.set(ox + 0.1, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.015;
        } else if (progress < 0.80) {
            // Phase 5: Refinement, material gleams
            var t5 = (progress - 0.65) / 0.15;

            // Finishing tool (plane for smoothing)
            var tool3 = this._tools[2];
            tool3.mesh.visible = true;
            tool3.mesh.material.opacity = 0.7;
            var planeCycle = (time * 3) % 1;
            tool3.mesh.position.set(
                matX + (planeCycle - 0.5) * 0.15,
                matY + 0.04,
                0.04
            );
            tool3.mesh.rotation.z = 0;

            this._tools[0].mesh.material.opacity = 0.3 * (1 - t5);
            this._tools[1].mesh.material.opacity = 0.3 * (1 - t5);

            // Fine shavings
            if (time - this._lastShav > 0.1) {
                this._emitShaving(tool3.mesh.position.x, matY, planeCycle > 0.5 ? 1 : -1);
                this._lastShav = time;
            }

            // Material is refined, starts gleaming
            this._material.scale.set(1.8, 0.65, 1.3);
            this._material.material.color.setRGB(0.95, 0.75, 0.45);
            this._material.material.opacity = 0.8 + Math.sin(time * 4) * 0.1;

            // Product glow starts
            this._productGlow.material.opacity = t5 * 0.12;
            this._productGlow.scale.setScalar(0.8 + t5 * 0.3);

            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.90) {
            // Phase 6: Finished product pulses with pride
            var t6 = (progress - 0.80) / 0.10;
            var pulseBeat = Math.sin(t6 * Math.PI * 3);

            // Hide tools
            for (var tj = 0; tj < 3; tj++) {
                this._tools[tj].mesh.material.opacity = 0.5 * (1 - t6);
            }

            // Material at final form, pulsing glow
            this._material.material.opacity = 0.9 + pulseBeat * 0.1;
            this._material.material.color.setRGB(1.0, 0.85 + pulseBeat * 0.1, 0.5);

            this._productGlow.material.opacity = 0.12 + pulseBeat * 0.08;
            this._productGlow.scale.setScalar(1.1 + pulseBeat * 0.2);

            model.position.set(ox + 0.1, oy, oz);
        } else {
            // Phase 7: Fade
            var t7 = (progress - 0.90) / 0.10;
            this._bench.material.opacity = 0.6 * (1 - t7);
            this._legL.material.opacity = 0.5 * (1 - t7);
            this._legR.material.opacity = 0.5 * (1 - t7);
            this._material.material.opacity = 0.9 * (1 - t7);
            this._productGlow.material.opacity = 0.15 * (1 - t7);

            for (var tk = 0; tk < 3; tk++) {
                this._tools[tk].mesh.material.opacity *= (1 - t7 * 0.1);
                if (this._tools[tk].mesh.material.opacity < 0.01) this._tools[tk].mesh.visible = false;
            }

            model.position.set(ox + 0.1 * (1 - t7), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update shaving particles
        for (var si = 0; si < this._shavings.length; si++) {
            var sh = this._shavings[si];
            if (sh.life <= 0) continue;
            sh.life -= delta;
            if (sh.life <= 0) { sh.mesh.visible = false; continue; }
            sh.mesh.position.x += sh.vx * delta;
            sh.mesh.position.y += sh.vy * delta;
            sh.mesh.position.z += sh.vz * delta;
            sh.vy -= 3.5 * delta; // gravity
            sh.mesh.rotation.z += sh.rotSpeed * delta;
            var slr = sh.life / sh.maxLife;
            sh.mesh.material.opacity = slr * 0.8;
            sh.mesh.scale.setScalar(0.5 + (1 - slr) * 0.3);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bench) { scene.remove(this._bench); this._bench.geometry.dispose(); this._bench.material.dispose(); }
        if (this._legL) { scene.remove(this._legL); this._legL.geometry.dispose(); this._legL.material.dispose(); }
        if (this._legR) { scene.remove(this._legR); this._legR.geometry.dispose(); this._legR.material.dispose(); }
        if (this._material) { scene.remove(this._material); this._material.geometry.dispose(); this._material.material.dispose(); }
        if (this._productGlow) { scene.remove(this._productGlow); this._productGlow.geometry.dispose(); this._productGlow.material.dispose(); }
        if (this._tools) {
            this._tools.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._shavings) {
            this._shavings.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        this._bench = this._legL = this._legR = this._material = this._productGlow = null;
        this._tools = this._shavings = null;
    }
};
