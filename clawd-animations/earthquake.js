export default {
    name: 'Earthquake',
    label: 'quaking',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Crack lines on the "ground"
        this._cracks = [];
        this._crackGroup = new THREE.Group();
        scene.add(this._crackGroup);
        var crackPaths = [
            [{ x: 0, y: 0 }, { x: -0.5, y: -0.2 }, { x: -1.2, y: 0.1 }, { x: -1.8, y: -0.15 }],
            [{ x: 0, y: 0 }, { x: 0.4, y: 0.15 }, { x: 1.0, y: -0.1 }, { x: 1.6, y: 0.05 }],
            [{ x: -0.3, y: -0.1 }, { x: -0.6, y: -0.5 }, { x: -1.0, y: -0.7 }],
            [{ x: 0.2, y: 0.05 }, { x: 0.5, y: -0.4 }, { x: 0.9, y: -0.6 }]
        ];
        var baseX = this._origPos.x, baseY = this._origPos.y - 0.2;
        for (var i = 0; i < crackPaths.length; i++) {
            var path = crackPaths[i];
            var points = [];
            for (var j = 0; j < path.length; j++) {
                points.push(new THREE.Vector3(baseX + path[j].x, baseY + path[j].y, 0));
            }
            var geo = new THREE.BufferGeometry().setFromPoints(points);
            var mat = new THREE.LineBasicMaterial({
                color: i < 2 ? 0xff6600 : 0xffaa00,
                transparent: true, opacity: 0
            });
            var crack = new THREE.Line(geo, mat);
            this._crackGroup.add(crack);
            this._cracks.push(crack);
        }

        // Debris particles
        this._debris = [];
        var debGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        for (var d = 0; d < 20; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: d % 2 === 0 ? 0x887766 : 0xaa9988,
                transparent: true, opacity: 0
            });
            var deb = new THREE.Mesh(debGeo, dMat);
            deb.visible = false;
            scene.add(deb);
            this._debris.push({ mesh: deb, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rv: 0 });
        }
        this._debIdx = 0;

        // Ground glow
        var glowGeo = new THREE.PlaneGeometry(4, 0.8);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4400, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._groundGlow = new THREE.Mesh(glowGeo, glowMat);
        this._groundGlow.position.set(baseX, baseY, -0.1);
        scene.add(this._groundGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;

        if (progress < 0.1) {
            // Rumble builds
            intensity = progress / 0.1;
        } else if (progress < 0.7) {
            // Full quake
            intensity = 1.0;
        } else if (progress < 0.85) {
            // Subsiding
            intensity = 1 - (progress - 0.7) / 0.15;
        }

        // Shake model
        var shakeX = Math.sin(time * 35) * 0.12 * intensity;
        var shakeY = Math.cos(time * 28) * 0.06 * intensity;
        model.position.set(orig.x + shakeX, orig.y + shakeY, orig.z);
        model.rotation.z = Math.sin(time * 20) * 0.08 * intensity;

        // Crack opacity
        for (var i = 0; i < this._cracks.length; i++) {
            this._cracks[i].material.opacity = intensity * 0.7;
        }

        // Ground glow
        this._groundGlow.material.opacity = intensity * 0.15;

        // Spawn debris during quake
        if (intensity > 0.5 && Math.random() < 0.3) {
            var d = this._debris[this._debIdx % this._debris.length];
            this._debIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(
                orig.x + (Math.random() - 0.5) * 2.5,
                orig.y - 0.1,
                (Math.random() - 0.5) * 0.3
            );
            d.vx = (Math.random() - 0.5) * 2;
            d.vy = 1.5 + Math.random() * 2;
            d.vz = (Math.random() - 0.5) * 0.5;
            d.rv = (Math.random() - 0.5) * 10;
            d.life = 0.5 + Math.random() * 0.5;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.8;
        }

        // Settle
        if (progress >= 0.85) {
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
            this._groundGlow.material.opacity = 0;
        }

        // Update debris
        for (var di = 0; di < this._debris.length; di++) {
            var db = this._debris[di];
            if (db.life <= 0) continue;
            db.life -= delta;
            if (db.life <= 0) { db.mesh.visible = false; continue; }
            db.mesh.position.x += db.vx * delta;
            db.mesh.position.y += db.vy * delta;
            db.mesh.position.z += db.vz * delta;
            db.vy -= 5 * delta;
            db.mesh.rotation.x += db.rv * delta;
            db.mesh.rotation.z += db.rv * 0.7 * delta;
            db.mesh.material.opacity = 0.8 * (db.life / db.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._crackGroup) { this._crackGroup.traverse(function(c) { if (c.isLine) { c.geometry.dispose(); c.material.dispose(); } }); scene.remove(this._crackGroup); }
        if (this._groundGlow) { scene.remove(this._groundGlow); this._groundGlow.geometry.dispose(); this._groundGlow.material.dispose(); }
        if (this._debris) { this._debris.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        this._cracks = this._crackGroup = this._groundGlow = this._debris = null;
    }
};
