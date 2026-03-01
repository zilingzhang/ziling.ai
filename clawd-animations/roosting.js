export default {
    name: 'Roosting',
    label: 'roosting',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Branch (horizontal cylinder)
        var branchGeo = new THREE.BoxGeometry(0.6, 0.03, 0.03);
        var branchMat = new THREE.MeshBasicMaterial({
            color: 0x665533, transparent: true, opacity: 0
        });
        this._branch = new THREE.Mesh(branchGeo, branchMat);
        this._branch.position.set(ox, oy + 0.15, -0.02);
        scene.add(this._branch);

        // Smaller support branch
        var subBranchGeo = new THREE.BoxGeometry(0.3, 0.02, 0.02);
        var subBranchMat = new THREE.MeshBasicMaterial({
            color: 0x554422, transparent: true, opacity: 0
        });
        this._subBranch = new THREE.Mesh(subBranchGeo, subBranchMat);
        this._subBranch.position.set(ox + 0.25, oy + 0.1, -0.02);
        this._subBranch.rotation.z = -0.3;
        scene.add(this._subBranch);

        // Roosting companions (small spheres settling nearby)
        this._companions = [];
        var compPositions = [
            { x: -0.2, y: 0.18, delay: 0.3 },
            { x: 0.15, y: 0.18, delay: 0.5 },
            { x: -0.1, y: 0.2, delay: 0.7 },
            { x: 0.25, y: 0.13, delay: 0.4 }
        ];
        var compGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var c = 0; c < compPositions.length; c++) {
            var cp = compPositions[c];
            var cMat = new THREE.MeshBasicMaterial({
                color: c % 2 === 0 ? 0x8877aa : 0x7766aa,
                transparent: true, opacity: 0
            });
            var comp = new THREE.Mesh(compGeo, cMat);
            comp.position.set(ox + cp.x, oy + cp.y + 0.3, 0);
            comp.visible = false;
            scene.add(comp);
            this._companions.push({
                mesh: comp,
                targetX: ox + cp.x,
                targetY: oy + cp.y,
                startY: oy + cp.y + 0.3,
                delay: cp.delay,
                settled: false
            });
        }

        // Stars (tiny twinkle particles)
        this._stars = [];
        var starGeo = new THREE.SphereGeometry(0.005, 4, 4);
        for (var s = 0; s < 25; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 3 === 0 ? 0xffffee : (s % 3 === 1 ? 0xeeeeff : 0xffeedd),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var star = new THREE.Mesh(starGeo, sMat);
            star.position.set(
                ox + (Math.random() - 0.5) * 2.0,
                oy + 0.2 + Math.random() * 0.8,
                -0.05
            );
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                twinkleSpeed: 1 + Math.random() * 3,
                twinklePhase: Math.random() * Math.PI * 2,
                baseOp: 0.3 + Math.random() * 0.4
            });
        }

        // Sleep glow (peaceful warm light)
        var sleepGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var sleepMat = new THREE.MeshBasicMaterial({
            color: 0x6644aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._sleepGlow = new THREE.Mesh(sleepGeo, sleepMat);
        this._sleepGlow.position.set(ox, oy + 0.15, 0);
        scene.add(this._sleepGlow);

        // Twilight ambient
        var twilightGeo = new THREE.PlaneGeometry(2.5, 1.5);
        var twilightMat = new THREE.MeshBasicMaterial({
            color: 0x221144, transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false
        });
        this._twilight = new THREE.Mesh(twilightGeo, twilightMat);
        this._twilight.position.set(ox, oy + 0.2, -0.1);
        scene.add(this._twilight);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Phase 1: Branch appears, evening setting (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            this._branch.material.opacity = t * 0.7;
            this._subBranch.material.opacity = t * 0.5;
            this._twilight.material.opacity = t * 0.05;
            model.position.set(ox, oy, oz);
        }
        // Phase 2: Model floats up to branch (10-28%)
        else if (progress < 0.28) {
            var t2 = (progress - 0.10) / 0.18;
            this._branch.material.opacity = 0.7;
            this._subBranch.material.opacity = 0.5;

            // Model rises to branch
            var riseEase = t2 * t2 * (3 - 2 * t2); // smoothstep
            model.position.set(
                ox + Math.sin(t2 * Math.PI) * 0.03,
                oy + riseEase * 0.15,
                oz
            );

            // Twilight deepens
            this._twilight.material.opacity = 0.05 + t2 * 0.03;
        }
        // Phase 3: Tucks in (scale compresses) (28-40%)
        else if (progress < 0.40) {
            var t3 = (progress - 0.28) / 0.12;
            model.position.set(ox, oy + 0.15, oz);

            // Slight scale compress
            var compress = 1 - t3 * 0.08;
            model.scale.copy(this._origScale).multiplyScalar(compress);

            // Gentle settling bob
            model.position.y = oy + 0.15 + Math.sin(time * 1.5) * 0.005 * (1 - t3);

            this._twilight.material.opacity = 0.08 + t3 * 0.02;
        }
        // Phase 4: Companions settle (40-58%)
        else if (progress < 0.58) {
            var t4 = (progress - 0.40) / 0.18;
            model.position.set(ox, oy + 0.15, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.92);

            for (var c = 0; c < this._companions.length; c++) {
                var comp = this._companions[c];
                var compT = Math.max(0, Math.min((t4 - comp.delay) * 3, 1));
                if (compT > 0) {
                    comp.mesh.visible = true;
                    var settleEase = compT * compT * (3 - 2 * compT);
                    comp.mesh.position.y = comp.startY + (comp.targetY - comp.startY) * settleEase;
                    comp.mesh.material.opacity = compT * 0.6;
                }
            }

            this._twilight.material.opacity = 0.10;
        }
        // Phase 5: Stars appear, night darkens (58-75%)
        else if (progress < 0.75) {
            var t5 = (progress - 0.58) / 0.17;
            model.position.set(ox, oy + 0.15, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.92);

            // All companions settled
            for (var c2 = 0; c2 < this._companions.length; c2++) {
                this._companions[c2].mesh.visible = true;
                this._companions[c2].mesh.material.opacity = 0.6;
                this._companions[c2].mesh.position.y = this._companions[c2].targetY;
            }

            // Stars appear sequentially
            var numStars = Math.floor(t5 * this._stars.length);
            for (var s = 0; s < this._stars.length; s++) {
                if (s < numStars) {
                    this._stars[s].mesh.visible = true;
                    var starFade = Math.min((t5 * this._stars.length - s) * 0.5, 1);
                    this._stars[s].mesh.material.opacity = starFade * this._stars[s].baseOp;
                }
            }

            // Sky darkens
            this._twilight.material.opacity = 0.10 + t5 * 0.05;
        }
        // Phase 6: Peaceful sleep glow (75-88%)
        else if (progress < 0.88) {
            var t6 = (progress - 0.75) / 0.13;
            model.position.set(ox, oy + 0.15, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.92);

            // All stars twinkle
            for (var s2 = 0; s2 < this._stars.length; s2++) {
                var st = this._stars[s2];
                st.mesh.visible = true;
                var twinkle = Math.sin(time * st.twinkleSpeed + st.twinklePhase);
                st.mesh.material.opacity = st.baseOp * (0.5 + twinkle * 0.5);
                st.mesh.scale.setScalar(0.8 + twinkle * 0.3);
            }

            // Sleep glow
            this._sleepGlow.material.opacity = t6 * 0.12 * (1 + Math.sin(time * 1) * 0.3);
            this._sleepGlow.scale.setScalar(1 + Math.sin(time * 0.8) * 0.05);

            // Companions breathe
            for (var c3 = 0; c3 < this._companions.length; c3++) {
                var breathe = Math.sin(time * 0.8 + c3 * 0.5) * 0.003;
                this._companions[c3].mesh.position.y = this._companions[c3].targetY + breathe;
            }

            // Model gentle breathing
            var breathModel = Math.sin(time * 0.7) * 0.003;
            model.position.y = oy + 0.15 + breathModel;
        }
        // Phase 7: Fade out (88-100%)
        else {
            var t7 = (progress - 0.88) / 0.12;

            this._branch.material.opacity = 0.7 * (1 - t7);
            this._subBranch.material.opacity = 0.5 * (1 - t7);
            this._twilight.material.opacity = 0.15 * (1 - t7);
            this._sleepGlow.material.opacity = 0.12 * (1 - t7);

            for (var s3 = 0; s3 < this._stars.length; s3++) {
                this._stars[s3].mesh.material.opacity = this._stars[s3].baseOp * (1 - t7);
            }
            for (var c4 = 0; c4 < this._companions.length; c4++) {
                this._companions[c4].mesh.material.opacity = 0.6 * (1 - t7);
            }

            model.position.set(
                ox,
                oy + 0.15 * (1 - t7),
                oz
            );
            model.scale.copy(this._origScale).multiplyScalar(0.92 + t7 * 0.08);

            if (t7 > 0.8) {
                model.position.copy(this._origPos);
                model.scale.copy(this._origScale);
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._branch) { scene.remove(this._branch); this._branch.geometry.dispose(); this._branch.material.dispose(); }
        if (this._subBranch) { scene.remove(this._subBranch); this._subBranch.geometry.dispose(); this._subBranch.material.dispose(); }
        if (this._companions) { this._companions.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._stars) { this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._sleepGlow) { scene.remove(this._sleepGlow); this._sleepGlow.geometry.dispose(); this._sleepGlow.material.dispose(); }
        if (this._twilight) { scene.remove(this._twilight); this._twilight.geometry.dispose(); this._twilight.material.dispose(); }
        this._branch = this._subBranch = this._companions = this._stars = this._sleepGlow = this._twilight = null;
    }
};