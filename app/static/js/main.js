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
        console.log('Saving recipe with data:', currentRecipeData);
        const response = await fetch('/save_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipe_data: currentRecipeData })
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            showSuccess(data.message || `Recipe "${data.title}" saved successfully`);
        } else {
            showError(data.error || 'Failed to save recipe');
        }
    } catch (error) {
        console.error('Error in saveRecipe:', error);
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

// Load saved recipes
async function loadSavedRecipes() {
    const container = document.getElementById('savedRecipesList');
    container.innerHTML = '<div class="loading-message">Loading saved recipes...</div>';
    
    try {
        const response = await fetch('/api/recipes?per_page=20');
        const data = await response.json();
        
        if (response.ok) {
            displaySavedRecipes(data.recipes);
        } else {
            container.innerHTML = '<div class="error-message">Failed to load recipes</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error loading recipes</div>';
        console.error('Error loading saved recipes:', error);
    }
}

// Display saved recipes
function displaySavedRecipes(recipes) {
    const container = document.getElementById('savedRecipesList');
    
    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<div class="no-recipes-message">No saved recipes found. Save some recipes to see them here!</div>';
        return;
    }
    
    const recipesHTML = recipes.map(recipe => `
        <div class="saved-recipe-item mdc-card mdc-elevation--z1" onclick="viewSavedRecipe(${recipe.id})">
            <div class="saved-recipe-header">
                <h4 class="mdc-typography--headline6">${recipe.title}</h4>
                <div class="saved-recipe-actions">
                    <button onclick="event.stopPropagation(); deleteSavedRecipe(${recipe.id})" class="mdc-icon-button material-icons" title="Delete recipe">
                        delete
                    </button>
                </div>
            </div>
            <div class="saved-recipe-meta">
                <div><i class="material-icons">kitchen</i> ${recipe.ingredients_used}</div>
                <div><i class="material-icons">schedule</i> ${new Date(recipe.timestamp).toLocaleDateString()}</div>
                ${recipe.dietary_restrictions ? `<div><i class="material-icons">health_and_safety</i> ${recipe.dietary_restrictions}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = recipesHTML;
}

// View a saved recipe
async function viewSavedRecipe(recipeId) {
    try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        const recipe = await response.json();
        
        if (response.ok) {
            // Convert saved recipe format to current recipe format
            currentRecipeData = {
                recipe: recipe.recipe,
                timestamp: recipe.timestamp,
                ingredients_used: recipe.ingredients_used,
                dietary_restrictions: recipe.dietary_restrictions,
                cuisine_preference: recipe.cuisine_preference,
                serving_size: recipe.serving_size
            };
            
            displayRecipe(currentRecipeData);
            showElement('recipeResult');
            
            // Scroll to recipe result
            document.getElementById('recipeResult').scrollIntoView({ behavior: 'smooth' });
            showSuccess(`Loaded recipe: ${recipe.title}`);
        } else {
            showError('Failed to load recipe');
        }
    } catch (error) {
        showError('Error loading recipe');
        console.error('Error loading recipe:', error);
    }
}

// Delete a saved recipe
async function deleteSavedRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recipes/${recipeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Recipe deleted successfully');
            loadSavedRecipes(); // Refresh the list
        } else {
            showError('Failed to delete recipe');
        }
    } catch (error) {
        showError('Error deleting recipe');
        console.error('Error deleting recipe:', error);
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
        mdcComponents.successSnackbar.timeoutMs = 4000;
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