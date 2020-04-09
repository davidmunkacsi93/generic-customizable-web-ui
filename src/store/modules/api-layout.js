import {
  DISABLE_EDIT_MODE_API_LAYOUT,
  ENABLE_EDIT_MODE_API_LAYOUT,
  SAVE_FORMS_REQUIRED
} from '../../types/action-types';

import EventBus from '../../utils/event-bus';

const state = {
  isEditModeActive: false,
  saveFormsRequired: false
};

const mutations = {
  disableEditModeApiLayout(state) {
    state.isEditModeActive = false;
    EventBus.$emit(DISABLE_EDIT_MODE_API_LAYOUT);
  },

  enableEditModeApiLayout(state) {
    state.isEditModeActive = true;
    EventBus.$emit(ENABLE_EDIT_MODE_API_LAYOUT);
  },
  saveFormsRequired(state) {
    state.saveFormsRequired = true;
  }
};

const actions = {
  disableEditModeApiLayout({ commit }) {
    commit(DISABLE_EDIT_MODE_API_LAYOUT);
  },
  enableEditModeApiLayout({ commit }) {
    commit(ENABLE_EDIT_MODE_API_LAYOUT);
  },
  saveFormsRequired({ commit }) {
    commit(SAVE_FORMS_REQUIRED);
  }
};

export default { state, mutations, actions };
