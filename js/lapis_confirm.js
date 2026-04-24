'use strict';

const LapisConfirm = {
    name: 'LapisConfirm',
    props: {
        modelValue: {
            type: Object,
            default: () => ({ show: false, title: '', message: '', onConfirm: null })
        }
    },
    emits: ['update:modelValue'],
    computed: {
        cancelText()  { return this.modelValue.cancelText  || 'Cancel';  },
        confirmText() { return this.modelValue.confirmText || 'Confirm'; }
    },
    methods: {
        close() {
            // Direct mutation works for reactive() parents; emit for ref() parents
            this.modelValue.show = false;
            this.$emit('update:modelValue', { ...this.modelValue });
        },
        confirm() {
            if (typeof this.modelValue.onConfirm === 'function') {
                this.modelValue.onConfirm();
            }
            this.close();
        }
    },
    template: `
        <transition name="fade">
            <div v-if="modelValue && modelValue.show"
                 class="fixed inset-0 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
                 style="z-index: var(--z-modal-lv3-backdrop)"
                 @click.self="close">
                <div class="lapis-modal-shell w-full max-w-xs text-center"
                     style="position: relative; z-index: var(--z-modal-lv3-content); border-radius: 2.5rem; animation: lapisShellScale 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;">
                    <h3 class="lapis-modal-title text-primary" v-text="modelValue.title || ''"></h3>
                    <p class="text-sm text-muted leading-relaxed" style="margin-top:8px" v-text="modelValue.message || ''"></p>
                    <div class="lapis-modal-footer">
                        <button @click="close" class="lapis-btn-secondary">{{ cancelText }}</button>
                        <button @click="confirm" class="lapis-btn-primary"
                                style="background:#dc2626;box-shadow:0 4px 16px rgba(220,38,38,0.35)">
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    `
};

if (typeof window !== 'undefined') {
    window.LapisConfirm = LapisConfirm;
}
