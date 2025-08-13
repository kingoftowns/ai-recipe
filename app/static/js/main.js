// Global variables
let currentRecipeData = null;
let mdcComponents = {};

// Initialize Material Design Components
function initializeMDCComponents() {
    // Initialize text fields
    document.querySelectorAll('.mdc-text-field').forEach(textField => {
        const mdcTextField = new mdc.textField.MDCTextField(textField);
        mdcComponents[textField.id] = mdcTextField;
    });
    
    // Initialize custom select elements (no special initialization needed for native selects)
    // Store references for form data collection
    mdcComponents['dietary_restrictions'] = document.getElementById('dietary_restrictions');
    mdcComponents['cuisine_preference'] = document.getElementById('cuisine_preference');
    
    // Initialize snackbars
    const errorSnackbar = document.querySelector('#errorContainer');
    const successSnackbar = document.querySelector('#successMessage');
    if (errorSnackbar) {
        mdcComponents.errorSnackbar = new mdc.snackbar.MDCSnackbar(errorSnackbar);
    }
    if (successSnackbar) {
        mdcComponents.successSnackbar = new mdc.snackbar.MDCSnackbar(successSnackbar);
    }
    
    // Initialize circular progress
    const progress = document.querySelector('.mdc-circular-progress');
    if (progress) {
        mdcComponents.progress = new mdc.circularProgress.MDCCircularProgress(progress);
    }
}

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
    
    // Get form data - using native select elements
    const formData = {
        ingredients: document.getElementById('ingredients').value.trim(),
        dietary_restrictions: document.getElementById('dietary_restrictions').value,
        cuisine_preference: document.getElementById('cuisine_preference').value,
        serving_size: parseInt(document.getElementById('serving_size').value)
    };
    
    // Show loading, hide others
    showElement('loadingIndicator');
    if (mdcComponents.progress) {
        mdcComponents.progress.open();
    }
    hideElement('recipeResult');
    
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
            // Animate the recipe card
            const recipeCard = document.getElementById('recipeResult');
            recipeCard.style.animation = 'fadeIn 0.5s ease-out';
        } else {
            showError(data.error || 'Failed to generate recipe');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        hideElement('loadingIndicator');
        if (mdcComponents.progress) {
            mdcComponents.progress.close();
        }
        setFormEnabled(true);
    }
}

// Display recipe
function displayRecipe(data) {
    const content = document.getElementById('recipeContent');
    const meta = document.getElementById('recipeMeta');
    
    // Format recipe content with proper line breaks
    content.textContent = data.recipe;
    
    // Display metadata with Material Icons
    meta.innerHTML = `
        <div><i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">kitchen</i> <strong>Ingredients:</strong> ${data.ingredients_used}</div>
        <div><i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">health_and_safety</i> <strong>Dietary:</strong> ${data.dietary_restrictions || 'None'}</div>
        <div><i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">public</i> <strong>Cuisine:</strong> ${data.cuisine_preference || 'Any'}</div>
        <div><i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">group</i> <strong>Servings:</strong> ${data.serving_size}</div>
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
    if (mdcComponents.errorSnackbar) {
        mdcComponents.errorSnackbar.labelText = message;
        mdcComponents.errorSnackbar.open();
    } else {
        // Fallback if snackbar not initialized
        console.error(message);
    }
}

function showSuccess(message) {
    if (mdcComponents.successSnackbar) {
        mdcComponents.successSnackbar.labelText = message;
        mdcComponents.successSnackbar.timeoutMs = 3000;
        mdcComponents.successSnackbar.open();
    } else {
        // Fallback if snackbar not initialized
        console.log(message);
    }
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

// Add ripple effect to buttons
function addRippleEffect() {
    document.querySelectorAll('.mdc-button').forEach(button => {
        mdc.ripple.MDCRipple.attachTo(button);
    });
    
    document.querySelectorAll('.mdc-icon-button').forEach(button => {
        const ripple = mdc.ripple.MDCRipple.attachTo(button);
        ripple.unbounded = true;
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize MDC components
    initializeMDCComponents();
    
    // Add ripple effects
    addRippleEffect();
    
    // Set focus on ingredients field after a short delay for MDC to initialize
    setTimeout(() => {
        const ingredientsField = document.getElementById('ingredients');
        if (ingredientsField) {
            ingredientsField.focus();
        }
    }, 100);
    
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
    
    // Add hover effects to cards
    document.querySelectorAll('.mdc-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});