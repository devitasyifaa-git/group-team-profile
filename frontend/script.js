// ==========================================
// API CONFIGURATION
// ==========================================

const API_BASE = "/api";

let members = [];

const memberForm = document.getElementById("memberForm");
const membersGrid = document.getElementById("membersGrid");
const emptyState = document.getElementById("emptyState");

const apiStatus = document.getElementById("apiStatus");

const memberCount = document.getElementById("memberCount");
const skillCount = document.getElementById("skillCount");
const roleCount = document.getElementById("roleCount");

const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = text;
    }

    return element;
}


function getInitials(name) {

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase();
}


// Resize image in the browser and return it as a JPEG data URL
function resizeImage(file, maxSize = 320) {

    return new Promise((resolve, reject) => {

        if (!file.type.startsWith("image/")) {
            reject(new Error("Please choose an image file."));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Failed to read the photo."));

        reader.onload = () => {

            const img = new Image();

            img.onerror = () => reject(new Error("Invalid image file."));

            img.onload = () => {

                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };

            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}


function resetPhotoPreview() {

    photoPreview.hidden = true;

    photoPreview.removeAttribute("src");
}


photoInput.addEventListener("change", async () => {

    const file = photoInput.files[0];

    if (!file) {
        resetPhotoPreview();
        return;
    }

    try {

        photoPreview.src = await resizeImage(file);

        photoPreview.hidden = false;

    } catch (error) {

        resetPhotoPreview();

        photoInput.value = "";

        formMessage.textContent = error.message;

        formMessage.className = "form-message error";
    }
});


function setApiStatus(online) {

    apiStatus.className = online
        ? "api-status online"
        : "api-status offline";

    apiStatus.lastChild.textContent = online
        ? " API Connected"
        : " API Disconnected";
}


function showEmptyState(title, description) {

    document.getElementById("emptyTitle").textContent = title;

    document.getElementById("emptyDescription").textContent =
        description;

    emptyState.hidden = false;
}


// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStatistics() {

    const allSkills = members.flatMap(member =>
        Array.isArray(member.skills) ? member.skills : []
    );

    const allRoles = members.map(member => member.role);

    const uniqueSkills = new Set(
        allSkills.map(skill => skill.toLowerCase())
    );

    const uniqueRoles = new Set(allRoles);

    memberCount.textContent = members.length;

    skillCount.textContent = uniqueSkills.size;

    roleCount.textContent = uniqueRoles.size;
}


// ==========================================
// RENDER MEMBER CARDS
// ==========================================

function renderMembers() {

    membersGrid.replaceChildren();

    updateStatistics();

    if (members.length === 0) {

        showEmptyState(
            "No members yet",
            "Add your first team member to get started."
        );

        return;
    }

    emptyState.hidden = true;

    members.forEach((member, index) => {

        const card = createElement(
            "article",
            "member-card"
        );


        // MEMBER HEADER

        const top = createElement(
            "div",
            "member-top"
        );

        let avatar;

        if (member.photo) {

            avatar = createElement(
                "img",
                "member-avatar member-avatar-photo"
            );

            avatar.src = member.photo;

            avatar.alt = "Photo of " + member.name;

        } else {

            avatar = createElement(
                "div",
                "member-avatar",
                getInitials(member.name)
            );
        }

        const identity = createElement(
            "div",
            "member-identity"
        );

        const name = createElement(
            "h3",
            "",
            member.name
        );

        const nim = createElement(
            "p",
            "",
            "NIM: " + member.nim
        );

        identity.append(name, nim);


        // DELETE BUTTON

        const deleteButton = createElement(
            "button",
            "delete-button",
            "×"
        );

        deleteButton.type = "button";

        deleteButton.setAttribute(
            "aria-label",
            "Delete " + member.name
        );

        deleteButton.title = "Delete member";

        deleteButton.addEventListener("click", () => {
            deleteMember(index);
        });


        top.append(
            avatar,
            identity,
            deleteButton
        );


        // ROLE

        const role = createElement(
            "span",
            "role-tag",
            member.role
        );


        // BIOGRAPHY

        const bio = createElement(
            "p",
            "member-bio",
            member.bio || "No biography provided."
        );


        // SKILLS

        const skillHeading = createElement(
            "p",
            "skill-heading",
            "SKILLS"
        );

        const skillList = createElement(
            "div",
            "skill-list"
        );

        const skills = Array.isArray(member.skills)
            ? member.skills
            : [];

        skills.forEach(skill => {

            const tag = createElement(
                "span",
                "skill-tag",
                skill
            );

            skillList.appendChild(tag);

        });


        // COMBINE CARD

        card.append(
            top,
            role,
            bio,
            skillHeading,
            skillList
        );

        membersGrid.appendChild(card);

    });

}


// ==========================================
// GET MEMBERS
// ==========================================

async function loadMembers() {

    try {

        const response = await fetch(
            `${API_BASE}/members`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to load members");
        }

        members = result.members || [];

        setApiStatus(true);

        renderMembers();

    } catch (error) {

        console.error("GET members error:", error);

        members = [];

        updateStatistics();

        membersGrid.replaceChildren();

        setApiStatus(false);

        showEmptyState(
            "Unable to load members",
            "Please check the backend API connection and try again."
        );

    }

}


// ==========================================
// POST MEMBER
// ==========================================

memberForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const skillsValue = document
        .getElementById("skills")
        .value;

    const skills = skillsValue
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);


    const payload = {

        name: document.getElementById("name").value.trim(),

        nim: document.getElementById("nim").value.trim(),

        role: document.getElementById("role").value.trim(),

        bio: document.getElementById("bio").value.trim(),

        skills: skills

    };


    if (skills.length === 0) {

        formMessage.textContent = "Please enter at least one skill.";

        formMessage.className = "form-message error";

        return;
    }


    submitButton.disabled = true;

    submitButton.textContent = "Saving...";

    formMessage.textContent = "";


    try {

        const photoFile = photoInput.files[0];

        if (photoFile) {
            payload.photo = await resizeImage(photoFile);
        }

        const response = await fetch(
            `${API_BASE}/members`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)
            }
        );


        const result = await response.json();

        if (!response.ok) {

            throw new Error(
                result.error || "Failed to add member"
            );

        }


        memberForm.reset();

        resetPhotoPreview();

        formMessage.textContent = "Member added successfully!";

        formMessage.className = "form-message success";

        await loadMembers();

    } catch (error) {

        console.error("POST member error:", error);

        formMessage.textContent = error.message;

        formMessage.className = "form-message error";

    } finally {

        submitButton.disabled = false;

        submitButton.textContent = "Add Member +";

    }

});


// ==========================================
// DELETE MEMBER
// ==========================================

async function deleteMember(index) {

    const member = members[index];

    if (!member) {
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete ${member.name}?`
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/members?index=${index}`,
            {
                method: "DELETE"
            }
        );


        const result = await response.json();

        if (!response.ok) {

            throw new Error(
                result.error || "Failed to delete member"
            );

        }


        await loadMembers();

    } catch (error) {

        console.error("DELETE member error:", error);

        alert(error.message);

    }

}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

loadMembers();