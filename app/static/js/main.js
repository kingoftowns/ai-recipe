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

// Global variable for current rating filter
let currentRatingFilter = '';

// Real-time recipe search
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener after DOM is loaded
    setTimeout(() => {
        const searchField = document.getElementById('recipeSearch');
        if (searchField) {
            searchField.addEventListener('input', debounce(async () => {
                const searchTerm = searchField.value.trim();
                await searchSavedRecipes(searchTerm, currentRatingFilter);
            }, 300));
        }
        
        // Add star filter event listeners - toggle behavior
        const starFilterBtns = document.querySelectorAll('.star-filter-btn');
        starFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isCurrentlyActive = btn.classList.contains('active');
                
                // Remove active state from all buttons
                starFilterBtns.forEach(b => b.classList.remove('active'));
                
                if (isCurrentlyActive) {
                    // If clicking the same button, turn off the filter
                    currentRatingFilter = '';
                } else {
                    // If clicking a different button or no button was active, activate this filter
                    btn.classList.add('active');
                    currentRatingFilter = btn.dataset.rating;
                }
                
                // Update search results
                const searchTerm = document.getElementById('recipeSearch').value.trim();
                searchSavedRecipes(searchTerm, currentRatingFilter);
            });
        });
    }, 100);
});

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
            // Hide edit button for new recipes (no ID yet)
            hideElement('editRecipeBtn');
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
    // Clear search field and rating filter when loading all recipes
    const searchField = document.getElementById('recipeSearch');
    if (searchField) {
        searchField.value = '';
    }
    
    // Reset rating filter
    currentRatingFilter = '';
    const starFilterBtns = document.querySelectorAll('.star-filter-btn');
    starFilterBtns.forEach(btn => btn.classList.remove('active'));
    
    const container = document.getElementById('savedRecipesList');
    container.innerHTML = '<div class="loading-message">Loading saved recipes...</div>';
    
    try {
        const response = await fetch('/api/recipes?per_page=50');
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

// Search saved recipes with real-time results
async function searchSavedRecipes(searchTerm, ratingFilter = '') {
    const container = document.getElementById('savedRecipesList');
    
    if (!searchTerm && !ratingFilter) {
        container.innerHTML = '<div class="loading-message">Start typing to search recipes, or click "Load All" to see all saved recipes</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading-message">Searching recipes...</div>';
    
    try {
        let url = '/api/recipes?per_page=50';
        const params = new URLSearchParams();
        
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        if (ratingFilter) {
            params.append('min_rating', ratingFilter);
        }
        
        if (params.toString()) {
            url += '&' + params.toString();
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            if (data.recipes && data.recipes.length > 0) {
                displaySavedRecipes(data.recipes, searchTerm);
            } else {
                let message = 'No recipes found';
                if (searchTerm && ratingFilter) {
                    message += ` for "${searchTerm}" with ${ratingFilter}+ stars`;
                } else if (searchTerm) {
                    message += ` for "${searchTerm}"`;
                } else if (ratingFilter) {
                    message += ` with ${ratingFilter}+ stars`;
                }
                message += '. Try different filters!';
                container.innerHTML = `<div class="no-recipes-message">${message}</div>`;
            }
        } else {
            container.innerHTML = '<div class="error-message">Failed to search recipes</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error searching recipes</div>';
        console.error('Error searching saved recipes:', error);
    }
}

// Display saved recipes
function displaySavedRecipes(recipes, searchTerm = '') {
    const container = document.getElementById('savedRecipesList');
    
    if (!recipes || recipes.length === 0) {
        if (searchTerm) {
            container.innerHTML = `<div class="no-recipes-message">No recipes found for "${searchTerm}". Try different keywords!</div>`;
        } else {
            container.innerHTML = '<div class="no-recipes-message">No saved recipes found. Save some recipes to see them here!</div>';
        }
        return;
    }
    
    // Helper function to highlight search terms
    function highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    // Helper function to generate star rating display
    function generateStarRating(rating) {
        if (!rating) return '<div class="star-rating"><span class="no-rating">No rating</span></div>';
        
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="material-icons star filled">star</i>';
            } else {
                stars += '<i class="material-icons star">star_border</i>';
            }
        }
        return `<div class="star-rating">${stars}</div>`;
    }
    
    const recipesHTML = recipes.map(recipe => `
        <div class="saved-recipe-item mdc-card mdc-elevation--z1" onclick="viewSavedRecipe(${recipe.id})">
            <div class="saved-recipe-header">
                <h4 class="mdc-typography--headline6">${highlightText(recipe.title, searchTerm)}</h4>
                <div class="saved-recipe-actions">
                    <button onclick="event.stopPropagation(); deleteSavedRecipe(${recipe.id})" class="mdc-icon-button material-icons" title="Delete recipe">
                        delete
                    </button>
                </div>
            </div>
            <div class="saved-recipe-meta">
                <div><i class="material-icons">kitchen</i> ${highlightText(recipe.ingredients_used, searchTerm)}</div>
                <div><i class="material-icons">schedule</i> ${new Date(recipe.timestamp).toLocaleDateString()}</div>
                ${recipe.dietary_restrictions ? `<div><i class="material-icons">health_and_safety</i> ${highlightText(recipe.dietary_restrictions, searchTerm)}</div>` : ''}
                ${generateStarRating(recipe.rating)}
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
            
            // Store the recipe ID for rating functionality and editing
            currentRecipeData.id = recipe.id;
            currentRecipeData.rating = recipe.rating;
            
            displayRecipe(currentRecipeData);
            showElement('recipeResult');
            showElement('recipeRating');
            
            // Show edit button for saved recipes
            showElement('editRecipeBtn');
            
            // Setup star rating for saved recipe
            setupStarRating(recipe.rating);
            
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

// Edit Recipe Functions
function editRecipe() {
    if (!currentRecipeData) {
        showError('No recipe to edit');
        return;
    }
    
    // Populate the edit form with current recipe data
    document.getElementById('editRecipeContent').value = currentRecipeData.recipe || '';
    document.getElementById('editIngredientsUsed').value = currentRecipeData.ingredients_used || '';
    document.getElementById('editDietaryRestrictions').value = currentRecipeData.dietary_restrictions || '';
    document.getElementById('editCuisinePreference').value = currentRecipeData.cuisine_preference || '';
    document.getElementById('editServingSize').value = currentRecipeData.serving_size || 4;
    
    // Show the modal
    showElement('editRecipeModal');
    
    // Re-initialize MDC components for the modal
    setTimeout(() => {
        document.querySelectorAll('#editRecipeModal .mdc-text-field').forEach(textField => {
            if (!textField.mdcTextField) {
                textField.mdcTextField = new mdc.textField.MDCTextField(textField);
            }
        });
        
        // Focus on the recipe content field
        const recipeContentField = document.getElementById('editRecipeContent');
        if (recipeContentField) {
            recipeContentField.focus();
        }
    }, 100);
}

function closeEditModal() {
    hideElement('editRecipeModal');
}

async function saveEditedRecipe() {
    if (!currentRecipeData || !currentRecipeData.id) {
        showError('No recipe ID found. Cannot save changes.');
        return;
    }
    
    // Get form data
    const recipeContent = document.getElementById('editRecipeContent').value.trim();
    const ingredientsUsed = document.getElementById('editIngredientsUsed').value.trim();
    const dietaryRestrictions = document.getElementById('editDietaryRestrictions').value;
    const cuisinePreference = document.getElementById('editCuisinePreference').value;
    const servingSize = parseInt(document.getElementById('editServingSize').value);
    
    // Validate required fields
    if (!recipeContent) {
        showError('Recipe content cannot be empty');
        return;
    }
    
    if (!ingredientsUsed) {
        showError('Ingredients cannot be empty');
        return;
    }
    
    if (isNaN(servingSize) || servingSize <= 0) {
        showError('Please enter a valid serving size');
        return;
    }
    
    // Prepare update data
    const updateData = {
        recipe_content: recipeContent,
        ingredients_used: ingredientsUsed,
        dietary_restrictions: dietaryRestrictions || null,
        cuisine_preference: cuisinePreference || null,
        serving_size: servingSize
    };
    
    try {
        const response = await fetch(`/api/recipes/${currentRecipeData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update the current recipe data
            currentRecipeData.recipe = recipeContent;
            currentRecipeData.ingredients_used = ingredientsUsed;
            currentRecipeData.dietary_restrictions = dietaryRestrictions;
            currentRecipeData.cuisine_preference = cuisinePreference;
            currentRecipeData.serving_size = servingSize;
            
            // Refresh the display
            displayRecipe(currentRecipeData);
            
            // Close the modal
            closeEditModal();
            
            showSuccess('Recipe updated successfully!');
        } else {
            showError(data.error || 'Failed to update recipe');
        }
    } catch (error) {
        showError('Failed to update recipe');
        console.error('Error updating recipe:', error);
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

// Setup interactive star rating
function setupStarRating(currentRating) {
    const stars = document.querySelectorAll('.star-interactive');
    const message = document.getElementById('ratingMessage');
    
    // Set current rating
    updateStarDisplay(currentRating || 0);
    
    // Add click handlers
    stars.forEach((star, index) => {
        star.addEventListener('click', async () => {
            const rating = index + 1;
            if (currentRecipeData && currentRecipeData.id) {
                await updateRecipeRating(currentRecipeData.id, rating);
            }
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarDisplay(index + 1, true);
        });
        
        star.addEventListener('mouseleave', () => {
            updateStarDisplay(currentRecipeData?.rating || 0);
        });
    });
    
    if (currentRating) {
        message.textContent = `Current rating: ${currentRating} star${currentRating !== 1 ? 's' : ''}`;
    } else {
        message.textContent = 'Click stars to rate this recipe';
    }
}

// Update star display
function updateStarDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('.star-interactive');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = 'star';
            star.classList.add(isHover ? 'hover' : 'filled');
            star.classList.remove(isHover ? 'filled' : 'hover');
        } else {
            star.textContent = 'star_border';
            star.classList.remove('filled', 'hover');
        }
    });
}

// Update recipe rating via API
async function updateRecipeRating(recipeId, rating) {
    try {
        const response = await fetch(`/api/recipes/${recipeId}/rating`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rating })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentRecipeData.rating = rating;
            updateStarDisplay(rating);
            document.getElementById('ratingMessage').textContent = `Rated ${rating} star${rating !== 1 ? 's' : ''}`;
            showSuccess(`Recipe rated ${rating} star${rating !== 1 ? 's' : ''}!`);
        } else {
            showError(data.error || 'Failed to update rating');
        }
    } catch (error) {
        showError('Failed to update rating');
        console.error('Error updating rating:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize MDC components
    initializeMDCComponents();
    
    // Add ripple effects
    addRippleEffect();
    
    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        // Close modal on Escape key
        if (e.key === 'Escape') {
            const modal = document.getElementById('editRecipeModal');
            if (modal && modal.style.display !== 'none') {
                closeEditModal();
            }
        }
    });
    
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