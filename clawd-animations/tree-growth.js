export default {
    name: 'Tree Growth',
    label: 'branching',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Branch lines
        this._branches = [];
        this._branchGroup = new THREE.Group();
        scene.add(this._branchGroup);
        var branchData = [
            { x1: 0, y1: 0, x2: -0.6, y2: 0.6, t: 0 },
            { x1: 0, y1: 0, x2: 0.5, y2: 0.7, t: 0.05 },
            { x1: -0.6, y1: 0.6, x2: -1.2, y2: 1.1, t: 0.15 },
            { x1: -0.6, y1: 0.6, x2: -0.3, y2: 1.2, t: 0.18 },
            { x1: 0.5, y1: 0.7, x2: 1.0, y2: 1.3, t: 0.2 },
            { x1: 0.5, y1: 0.7, x2: 0.1, y2: 1.3, t: 0.22 },
            { x1: -1.2, y1: 1.1, x2: -1.7, y2: 1.5, t: 0.3 },
            { x1: -0.3, y1: 1.2, x2: -0.7, y2: 1.7, t: 0.32 },
            { x1: 1.0, y1: 1.3, x2: 1.4, y2: 1.8, t: 0.34 },
            { x1: 0.1, y1: 1.3, x2: -0.3, y2: 1.8, t: 0.36 },
            { x1: -1.7, y1: 1.5, x2: -2.1, y2: 1.9, t: 0.42 },
            { x1: 1.4, y1: 1.8, x2: 1.8, y2: 2.2, t: 0.45 }
        ];
        var ox = this._origPos.x, oy = this._origPos.y + 0.2;
        for (var i = 0; i < branchData.length; i++) {
            var bd = branchData[i];
            var geo = new THREE.BufferGeometry();
            var positions = new Float32Array([ox + bd.x1, oy + bd.y1, 0, ox + bd.x1, oy + bd.y1, 0]);
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            var thick = i < 2 ? 3.0 : i < 6 ? 2.5 : 2.0;
            var mat = new THREE.LineBasicMaterial({
                color: i < 2 ? 0xccaa55 : (i < 6 ? 0x88cc55 : 0x66ee66),
                transparent: true, opacity: 0, linewidth: thick
            });
            var line = new THREE.Line(geo, mat);
            this._branchGroup.add(line);
            this._branches.push({
                line: line, sx: ox + bd.x1, sy: oy + bd.y1,
                ex: ox + bd.x2, ey: oy + bd.y2, startT: bd.t
            });
        }

        // Leaf particles at branch tips
        this._leaves = [];
        var leafGeo = new THREE.SphereGeometry(0.06, 6, 6);
        for (var j = 0; j < 20; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0x55dd55 : (j % 3 === 1 ? 0x77ff77 : 0x99ff55),
                transparent: true, opacity: 0
            });
            var leaf = new THREE.Mesh(leafGeo, lMat);
            leaf.visible = false;
            scene.add(leaf);
            this._leaves.push({ mesh: leaf, baseX: 0, baseY: 0, phase: Math.random() * Math.PI * 2, active: false });
        }
        this._leafIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var growPhase = Math.min(progress / 0.6, 1); // branches grow in first 60%

        // Grow branches
        for (var i = 0; i < this._branches.length; i++) {
            var b = this._branches[i];
            var localP = Math.max(0, Math.min((growPhase - b.startT) / 0.15, 1));
            var ease = 1 - Math.pow(1 - localP, 2);
            var pos = b.line.geometry.attributes.position.array;
            pos[3] = b.sx + (b.ex - b.sx) * ease;
            pos[4] = b.sy + (b.ey - b.sy) * ease;
            b.line.geometry.attributes.position.needsUpdate = true;
            b.line.material.opacity = localP * 1.0;

            // Spawn leaf when branch reaches tip
            if (ease > 0.9 && i >= 6 && !b._leafed) {
                b._leafed = true;
                var li = this._leafIdx % this._leaves.length;
                var leaf = this._leaves[li];
                leaf.active = true;
                leaf.mesh.visible = true;
                leaf.baseX = b.ex;
                leaf.baseY = b.ey;
                this._leafIdx++;
            }
        }

        // Animate leaves (gentle sway)
        for (var j = 0; j < this._leaves.length; j++) {
            var lf = this._leaves[j];
            if (!lf.active) continue;
            lf.mesh.position.set(
                lf.baseX + Math.sin(time * 2 + lf.phase) * 0.03,
                lf.baseY + Math.cos(time * 1.5 + lf.phase) * 0.02,
                0
            );
            var leafOp = progress < 0.8 ? Math.min((progress - 0.3) * 3, 0.9) : 0.9 * (1 - (progress - 0.8) / 0.2);
            lf.mesh.material.opacity = Math.max(0, leafOp);
            lf.mesh.scale.setScalar(0.5 + Math.sin(time * 3 + lf.phase) * 0.15);
        }

        // Model stays rooted, gentle pulse
        model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 2) * 0.03));

        // Fade out in last 20%
        if (progress > 0.8) {
            var fadeOut = (progress - 0.8) / 0.2;
            for (var k = 0; k < this._branches.length; k++) {
                this._branches[k].line.material.opacity *= (1 - fadeOut);
            }
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._branchGroup) {
            this._branchGroup.traverse(function(child) {
                if (child.isLine) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._branchGroup);
        }
        if (this._leaves) { this._leaves.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        this._branches = this._branchGroup = this._leaves = null;
    }
};
