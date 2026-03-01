import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Shadow Clone',
    label: 'cloning',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Afterimage clones — semi-transparent copies left behind during dash
        this._ghostCount = 8;
        this._ghosts = [];
        this._ghostGroup = new THREE.Group();
        scene.add(this._ghostGroup);
        for (var i = 0; i < this._ghostCount; i++) {
            var ghost = cloneWithMaterials(model);
            setCloneOpacity(ghost, 0);
            ghost.visible = false;
            this._ghostGroup.add(ghost);
            this._ghosts.push({ clone: ghost, spawnTime: -1, active: false });
        }
        this._ghostIdx = 0;
        this._gs = this._origScale.x;

        // Speed lines
        this._lines = [];
        var lineGeo = new THREE.BoxGeometry(0.3, 0.005, 0.005);
        for (var j = 0; j < 12; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: 0xaaddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            line.visible = false;
            scene.add(line);
            this._lines.push({ mesh: line, life: 0, maxLife: 0 });
        }
        this._lineIdx = 0;
        this._lastGhost = 0;
    },
    _spawnGhost(x, y, scale, time) {
        var g = this._ghosts[this._ghostIdx % this._ghostCount];
        this._ghostIdx++;
        g.clone.visible = true;
        g.clone.position.set(x, y, 0);
        g.clone.scale.setScalar(scale);
        g.clone.rotation.set(0, 0, 0);
        setCloneOpacity(g.clone, 0.6);
        g.spawnTime = time;
        g.active = true;
    },
    _spawnLine(x, y) {
        var l = this._lines[this._lineIdx % this._lines.length];
        this._lineIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.3);
        l.mesh.material.opacity = 0.5;
        l.life = 0.3;
        l.maxLife = 0.3;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var oz = orig.z;
        var gs = this._gs;

        if (progress < 0.08) {
            // Crouch / charge
            var t = progress / 0.08;
            model.scale.set(gs * (1 + t * 0.1), gs * (1 - t * 0.15), gs);
            model.position.y = orig.y - t * 0.05;
        } else if (progress < 0.25) {
            // Dash right, leaving afterimages
            var t2 = (progress - 0.08) / 0.17;
            var dashX = orig.x + t2 * 1.5;
            model.position.set(dashX, orig.y, oz);
            model.scale.setScalar(gs);
            model.rotation.z = -0.1;

            if (time - this._lastGhost > 0.06) {
                this._spawnGhost(model.position.x, model.position.y, gs, time);
                this._spawnLine(model.position.x, model.position.y);
                this._lastGhost = time;
            }
        } else if (progress < 0.4) {
            // Dash left past origin
            var t3 = (progress - 0.25) / 0.15;
            var dashX2 = orig.x + 1.5 - t3 * 3.5;
            model.position.set(dashX2, orig.y + Math.sin(t3 * Math.PI) * 0.3, oz);
            model.rotation.z = 0.1;

            if (time - this._lastGhost > 0.05) {
                this._spawnGhost(model.position.x, model.position.y, gs, time);
                this._spawnLine(model.position.x, model.position.y);
                this._lastGhost = time;
            }
        } else if (progress < 0.55) {
            // Dash up-right (diagonal)
            var t4 = (progress - 0.4) / 0.15;
            model.position.set(
                orig.x - 2.0 + t4 * 2.5,
                orig.y + t4 * 1.2,
                oz
            );
            model.rotation.z = -0.15;

            if (time - this._lastGhost > 0.05) {
                this._spawnGhost(model.position.x, model.position.y, gs, time);
                this._spawnLine(model.position.x, model.position.y);
                this._lastGhost = time;
            }
        } else if (progress < 0.7) {
            // Dash down to origin area
            var t5 = (progress - 0.55) / 0.15;
            model.position.set(
                orig.x + 0.5 - t5 * 0.5,
                orig.y + 1.2 - t5 * 1.2,
                oz
            );
            model.rotation.z = 0.12;

            if (time - this._lastGhost > 0.06) {
                this._spawnGhost(model.position.x, model.position.y, gs, time);
                this._spawnLine(model.position.x, model.position.y);
                this._lastGhost = time;
            }
        } else if (progress < 0.85) {
            // All ghosts poof simultaneously
            var t6 = (progress - 0.7) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.setScalar(gs);

            for (var i = 0; i < this._ghosts.length; i++) {
                var g = this._ghosts[i];
                if (!g.active) continue;
                setCloneOpacity(g.clone, (1 - t6) * 0.5);
                g.clone.scale.setScalar(gs * (1 + t6 * 0.3));
                if (t6 > 0.8) { g.clone.visible = false; g.active = false; }
            }
        } else {
            // Return to rest
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
            for (var j = 0; j < this._ghosts.length; j++) {
                this._ghosts[j].clone.visible = false;
                this._ghosts[j].active = false;
            }
        }

        // Fade active ghosts over time
        for (var k = 0; k < this._ghosts.length; k++) {
            var gh = this._ghosts[k];
            if (!gh.active || progress > 0.7) continue;
            var age = time - gh.spawnTime;
            var fade = Math.max(0, 1 - age / 0.8);
            setCloneOpacity(gh.clone, fade * 0.5);
            if (fade <= 0) { gh.clone.visible = false; gh.active = false; }
        }

        // Update speed lines
        for (var m = 0; m < this._lines.length; m++) {
            var ln = this._lines[m];
            if (ln.life <= 0) continue;
            ln.life -= delta;
            if (ln.life <= 0) { ln.mesh.visible = false; continue; }
            ln.mesh.material.opacity = 0.4 * (ln.life / ln.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._ghosts) { for (var i = 0; i < this._ghosts.length; i++) disposeClone(this._ghosts[i].clone); }
        if (this._ghostGroup) scene.remove(this._ghostGroup);
        if (this._lines) { this._lines.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        this._ghosts = this._ghostGroup = this._lines = null;
    }
};
