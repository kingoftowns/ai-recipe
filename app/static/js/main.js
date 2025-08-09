// Global variables
let currentRecipeData = null;

// Form submission
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateRecipe();
});

// Validate ingredients button
document.getElementById('validateBtn').addEventListener('click', async () => {
    await validateIngredients();
});

// Real-time ingredient validation
document.getElementById('ingredients').addEventListener('input', debounce(async () => {
    const ingredients = document.getElementById('ingredients').value.trim();
    if (ingredients) {
        await validateIngredients(true);
    } else {
        document.getElementById('ingredientsFeedback').innerHTML = '';
    }
}, 500));

// Validate ingredients function
async function validateIngredients(silent = false) {
    const ingredients = document.getElementById('ingredients').value.trim();
    const feedback = document.getElementById('ingredientsFeedback');
    
    if (!ingredients) {
        if (!silent) {
            feedback.innerHTML = '<span class="error">Please enter at least one ingredient</span>';
            feedback.className = 'feedback error';
        }
        return false;
    }
    
    try {
        const response = await fetch('/validate_ingredients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ingredients })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            feedback.innerHTML = `<span class="success">${data.message}</span>`;
            feedback.className = 'feedback success';
            return true;
        } else {
            feedback.innerHTML = `<span class="error">${data.message}</span>`;
            feedback.className = 'feedback error';
            return false;
        }
    } catch (error) {
        if (!silent) {
            feedback.innerHTML = '<span class="error">Error validating ingredients</span>';
            feedback.className = 'feedback error';
        }
        return false;
    }
}

// Generate recipe function
async function generateRecipe() {
    // Validate first
    const isValid = await validateIngredients();
    if (!isValid) {
        return;
    }
    
    // Get form data
    const formData = {
        ingredients: document.getElementById('ingredients').value.trim(),
        dietary_restrictions: document.getElementById('dietary_restrictions').value,
        cuisine_preference: document.getElementById('cuisine_preference').value,
        serving_size: parseInt(document.getElementById('serving_size').value)
    };
    
    // Show loading, hide others
    showElement('loadingIndicator');
    hideElement('recipeResult');
    hideElement('errorContainer');
    hideElement('successMessage');
    
    // Disable form
    setFormEnabled(false);
    
    try {
        const response = await fetch('/generate_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentRecipeData = data;
            displayRecipe(data);
            showElement('recipeResult');
        } else {
            showError(data.error || 'Failed to generate recipe');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        hideElement('loadingIndicator');
        setFormEnabled(true);
    }
}

// Display recipe
function displayRecipe(data) {
    const content = document.getElementById('recipeContent');
    const meta = document.getElementById('recipeMeta');
    
    // Format recipe content with proper line breaks
    content.textContent = data.recipe;
    
    // Display metadata
    meta.innerHTML = `
        <div><strong>Ingredients Used:</strong> ${data.ingredients_used}</div>
        <div><strong>Dietary:</strong> ${data.dietary_restrictions || 'None'}</div>
        <div><strong>Cuisine:</strong> ${data.cuisine_preference || 'Any'}</div>
        <div><strong>Servings:</strong> ${data.serving_size}</div>
    `;
}

// Save recipe
async function saveRecipe() {
    if (!currentRecipeData) {
        showError('No recipe to save');
        return;
    }
    
    try {
        const response = await fetch('/save_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipe_data: currentRecipeData })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess(`Recipe saved as ${data.filename}`);
        } else {
            showError(data.error || 'Failed to save recipe');
        }
    } catch (error) {
        showError('Failed to save recipe');
    }
}

// Export recipe
async function exportRecipe(format) {
    if (!currentRecipeData) {
        showError('No recipe to export');
        return;
    }
    
    try {
        const response = await fetch(`/export_recipe/${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipe_data: currentRecipeData })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recipe_${new Date().getTime()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showSuccess(`Recipe exported as ${format.toUpperCase()}`);
        } else {
            showError('Failed to export recipe');
        }
    } catch (error) {
        showError('Failed to export recipe');
    }
}

// Copy recipe to clipboard
async function copyRecipe() {
    if (!currentRecipeData) {
        showError('No recipe to copy');
        return;
    }
    
    const recipeText = `Recipe Generated on ${currentRecipeData.timestamp}

Ingredients Used: ${currentRecipeData.ingredients_used}
Dietary Restrictions: ${currentRecipeData.dietary_restrictions || 'None'}
Cuisine Preference: ${currentRecipeData.cuisine_preference || 'Any'}
Serving Size: ${currentRecipeData.serving_size}

${currentRecipeData.recipe}`;
    
    try {
        await navigator.clipboard.writeText(recipeText);
        showSuccess('Recipe copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = recipeText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showSuccess('Recipe copied to clipboard!');
        } catch (err) {
            showError('Failed to copy recipe');
        }
        document.body.removeChild(textArea);
    }
}

// Modal functions
function showAbout() {
    document.getElementById('aboutModal').style.display = 'block';
}

function closeAbout() {
    document.getElementById('aboutModal').style.display = 'none';
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('aboutModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Utility functions
function showElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'none';
    }
}

function setFormEnabled(enabled) {
    const form = document.getElementById('recipeForm');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        input.disabled = !enabled;
    });
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    showElement('errorContainer');
    setTimeout(() => hideElement('errorContainer'), 5000);
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    successText.textContent = message;
    showElement('successMessage');
    setTimeout(() => hideElement('successMessage'), 3000);
}

// Debounce function for real-time validation
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set focus on ingredients field
    document.getElementById('ingredients').focus();
    
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});